/**
 * "Answer v1" mapping: each renderer's captured response -> the answer sent
 * with a result item, and the size limits that keep a submission valid.
 *
 * Plain script run by `tsx` (package.json `test:answer`), like the other
 * suites here. Imports only the pure modules, so it runs in plain node.
 * Exits non-zero on the first failed check.
 *
 * The server's grading rules are re-stated below (SERVER MIRROR) so the
 * round-trip checks can ask "would the server grade this response correct?"
 * for a fixture question. Each mirror names the server function it copies.
 */
import assert from 'node:assert/strict';
import * as B from '../answerV1';
import {
  ANSWER_MAX_ENTRIES,
  ANSWER_MAX_STRING,
  clampText,
  noEmptyStrings,
  type AnswerV1,
} from '../answerV1';
import {
  toPracticeQuestionResult,
  toQuizQuestionResult,
} from '../../transforms/Practice';

// Every answer any test maps goes through these wrappers, which assert the
// answer never contains an empty string anywhere (the deployed validator
// rejects '' and would 400 the whole submission).
function noEmpty(a: AnswerV1 | null): AnswerV1 | null {
  const walk = (x: unknown): void => {
    assert.notEqual(x, '', 'mapped answer contains an empty string');
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object')
      Object.entries(x).forEach(([k, v]) => {
        assert.notEqual(k, '', 'mapped answer has an empty key');
        walk(v);
      });
  };
  walk(a);
  return a;
}
const choiceAnswer = (...a: Parameters<typeof B.choiceAnswer>) => noEmpty(B.choiceAnswer(...a));
const orderAnswer = (...a: Parameters<typeof B.orderAnswer>) => noEmpty(B.orderAnswer(...a));
const matchAnswer = (...a: Parameters<typeof B.matchAnswer>) => noEmpty(B.matchAnswer(...a));
const blanksAnswer = (...a: Parameters<typeof B.blanksAnswer>) => noEmpty(B.blanksAnswer(...a));
const countsAnswer = (...a: Parameters<typeof B.countsAnswer>) => noEmpty(B.countsAnswer(...a));
const textAnswer = (...a: Parameters<typeof B.textAnswer>) => noEmpty(B.textAnswer(...a));
const fractionAnswer = (...a: Parameters<typeof B.fractionAnswer>) => noEmpty(B.fractionAnswer(...a));

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// SERVER MIRROR. Copies of rules in the student API's answer grading
// (src/business/grading) and result request validator
// (src/modules/result/result.request.validator.ts).
// ---------------------------------------------------------------------------
interface Opt {
  questionoptionid: string;
  questionoptiontext?: string;
  questionoptioniscorrect: boolean;
  questionoptionsequence?: number;
}

/** Mirrors isAnswerV1 (grading/index.ts): shape of each `type`. */
function serverIsAnswerV1(x: any): boolean {
  if (!x || typeof x !== 'object' || Array.isArray(x) || x.v !== 1) return false;
  const strs = (a: any) => Array.isArray(a) && a.every((v: any) => typeof v === 'string');
  const rec = (r: any, ok: (v: any) => boolean) =>
    !!r && typeof r === 'object' && !Array.isArray(r) && Object.values(r).every(ok);
  switch (x.type) {
    case 'choice': return strs(x.selected);
    case 'order': return strs(x.order);
    case 'match': return rec(x.pairs, v => typeof v === 'string');
    case 'blanks': return strs(x.filled);
    case 'counts': return rec(x.counts, v => Number.isInteger(v) && v >= 0);
    case 'text': return rec(x.entries, v => typeof v === 'string');
    case 'fraction':
      return rec(x.parts, v => !!v && typeof v.numerator === 'string' && typeof v.denominator === 'string');
    default: return false;
  }
}

/** Mirrors the `answerv1` joi schema (result.request.validator.ts): caps. */
function serverWithinCaps(a: any): boolean {
  // Mirrors joi.string().max(200).strict() (boundedString): joi's string()
  // REJECTS '' unless .allow('') is set, and the validator does not set it.
  // isAnswerV1 and the graders accept '', so only this rule catches it.
  const str = (s: any) => typeof s === 'string' && s.length >= 1 && s.length <= ANSWER_MAX_STRING;
  const arr = (x: any) => x === undefined || (Array.isArray(x) && x.length <= 50 && x.every(str));
  const rec = (x: any, ok: (v: any) => boolean) =>
    x === undefined ||
    (Object.keys(x).length <= 50 && Object.entries(x).every(([k, v]) => str(k) && ok(v)));
  return (
    arr(a.selected) && arr(a.order) && arr(a.filled) &&
    rec(a.pairs, str) && rec(a.entries, str) &&
    rec(a.counts, v => Number.isInteger(v) && v >= 0) &&
    rec(a.parts, v => str(v.numerator) && str(v.denominator))
  );
}

/** Mirrors gradeChoice (grading/templates.ts). */
function serverGradeChoice(options: Opt[], selected: string[]): boolean {
  const correct = new Set(options.filter(o => o.questionoptioniscorrect).map(o => o.questionoptionid));
  const sel = new Set(selected);
  if (sel.size !== selected.length) return false;
  if (sel.size !== correct.size) return false;
  for (const id of sel) if (!correct.has(id)) return false;
  return true;
}

/** Mirrors gradeOrder (grading/templates.ts). */
function serverGradeOrder(options: Opt[], order: string[]): boolean {
  if (order.length !== options.length) return false;
  if (new Set(order).size !== order.length) return false;
  const byId = new Map(options.map(o => [o.questionoptionid, o]));
  let cur = 0;
  for (const id of order) {
    const o = byId.get(id);
    if (!o || typeof o.questionoptionsequence !== 'number') return false;
    if (o.questionoptionsequence < cur) return false;
    cur = o.questionoptionsequence;
  }
  return true;
}

/** Mirrors gradeMatch (grading/templates.ts): pairs[target] === target. */
function serverGradeMatch(options: Opt[], pairs: Record<string, string>): boolean {
  for (const o of options) if (pairs[o.questionoptionid] !== o.questionoptionid) return false;
  return true;
}

/** Mirrors gradeBlanks (grading/templates.ts). */
function serverGradeBlanks(options: Opt[], filled: string[]): boolean {
  const required = options.length;
  if (filled.length !== required) return false;
  if (new Set(filled).size !== filled.length) return false;
  const byId = new Map(options.map(o => [o.questionoptionid, o]));
  let cur = 0;
  for (const id of filled) {
    const o = byId.get(id);
    if (!o || typeof o.questionoptionsequence !== 'number') return false;
    if (o.questionoptionsequence < cur) return false;
    if (required > 1 && o.questionoptioniscorrect !== true) return false;
    cur = o.questionoptionsequence;
  }
  return true;
}

/** Mirrors gradeAnswer's dispatch (grading/index.ts) for templates 1-8. */
const EXPECTED_TYPE: Record<number, AnswerV1['type']> = {
  1: 'choice', 2: 'choice', 3: 'choice', 4: 'choice',
  5: 'order', 6: 'order', 7: 'match', 8: 'blanks',
};
function serverGrade(templatetypeid: number, options: Opt[], answer: AnswerV1 | null): boolean | 'ungradable' {
  if (answer === null) return 'ungradable';
  if (!serverIsAnswerV1(answer) || !serverWithinCaps(answer)) return 'ungradable';
  if (answer.type !== EXPECTED_TYPE[templatetypeid]) return 'ungradable';
  switch (answer.type) {
    case 'choice': return serverGradeChoice(options, answer.selected);
    case 'order': return serverGradeOrder(options, answer.order);
    case 'match': return serverGradeMatch(options, answer.pairs);
    case 'blanks': return serverGradeBlanks(options, answer.filled);
    default: return 'ungradable';
  }
}

// ---------------------------------------------------------------------------
// Fixtures: option ids are uuids; text is Khmer.
// ---------------------------------------------------------------------------
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const opt = (n: number, text: string, correct: boolean, seq?: number): Opt => ({
  questionoptionid: U(n),
  questionoptiontext: text,
  questionoptioniscorrect: correct,
  ...(seq === undefined ? {} : { questionoptionsequence: seq }),
});

const singleChoice = [opt(1, 'ភ្នំពេញ', true), opt(2, 'បាត់ដំបង', false), opt(3, 'សៀមរាប', false)];
const multiChoice = [opt(4, 'លេខ ២', true), opt(5, 'លេខ ៣', false), opt(6, 'លេខ ៤', true), opt(7, 'លេខ ៥', false)];
const ordering = [opt(8, 'ទីមួយ', true, 1), opt(9, 'ទីពីរ', true, 2), opt(10, 'ទីបី', true, 3), opt(11, 'ទីបួន', true, 4)];
const dragDrop = [opt(12, 'ឆ្កែ', true, 1), opt(13, 'ឆ្មា', true, 2), opt(14, 'មាន់', true, 3)];
const fillBlank = [opt(15, 'ស្រឡាញ់', true, 1), opt(16, 'សិក្សា', true, 2)];
const fillBlankDistractor = U(17); // a tile that is not one of the real options

const ids = (o: Opt[]) => o.map(x => x.questionoptionid);

// ---------------------------------------------------------------------------
// Round trip, templates 1-8: a correct response, as the renderer holds it,
// mapped by this module, is graded correct by the server rules; a wrong one
// is graded incorrect (so the check can fail in both directions).
// ---------------------------------------------------------------------------
check('template 1 MCQSingleText: correct choice round-trips', () => {
  const a = choiceAnswer([U(1)]);
  assert.deepEqual(a, { v: 1, type: 'choice', selected: [U(1)] });
  assert.equal(serverGrade(1, singleChoice, a), true);
  assert.equal(serverGrade(1, singleChoice, choiceAnswer([U(2)])), false);
});

check('template 2 MCQSingleImage: correct choice round-trips', () => {
  assert.equal(serverGrade(2, singleChoice, choiceAnswer([U(1)])), true);
  assert.equal(serverGrade(2, singleChoice, choiceAnswer([U(3)])), false);
});

check('template 3 MCQMultiText: every correct option, any order', () => {
  assert.equal(serverGrade(3, multiChoice, choiceAnswer([U(6), U(4)])), true);
  assert.equal(serverGrade(3, multiChoice, choiceAnswer([U(4)])), false); // partial
  assert.equal(serverGrade(3, multiChoice, choiceAnswer([U(4), U(6), U(5)])), false); // extra
});

check('template 4 MCQMultiImage: correct choice round-trips', () => {
  assert.equal(serverGrade(4, multiChoice, choiceAnswer([U(4), U(6)])), true);
});

check('template 5 TextOrdering: learner order by sequence round-trips', () => {
  // The learner tapped the words in the right sequence.
  assert.equal(serverGrade(5, ordering, orderAnswer([U(8), U(9), U(10), U(11)])), true);
  assert.equal(serverGrade(5, ordering, orderAnswer([U(9), U(8), U(10), U(11)])), false);
});

check('template 6 ImageOrdering: learner order by sequence round-trips', () => {
  assert.equal(serverGrade(6, ordering, orderAnswer([U(8), U(9), U(10), U(11)])), true);
  assert.equal(serverGrade(6, ordering, orderAnswer([U(11), U(10), U(9), U(8)])), false);
});

check('template 7 DragDrop: target id -> dragged id, every option on its own target', () => {
  // The renderer holds drop-target option id -> id of the option placed there.
  const held = { [U(12)]: U(12), [U(13)]: U(13), [U(14)]: U(14) };
  const a = matchAnswer(held);
  assert.deepEqual(a, { v: 1, type: 'match', pairs: held });
  assert.equal(serverGrade(7, dragDrop, a), true);
  // Direction is target -> dragged. A correct answer maps each id to itself
  // (symmetric), so the direction is pinned with a non-identity input.
  assert.deepEqual(matchAnswer({ [U(12)]: U(13) }), { v: 1, type: 'match', pairs: { [U(12)]: U(13) } });
  // Swapped pair: same ids, wrong direction/target.
  assert.equal(serverGrade(7, dragDrop, matchAnswer({ [U(12)]: U(13), [U(13)]: U(12), [U(14)]: U(14) })), false);
  // A target left empty is not sent, and is wrong.
  assert.equal(serverGrade(7, dragDrop, matchAnswer({ [U(12)]: U(12), [U(13)]: '', [U(14)]: U(14) })), false);
});

check('template 8 FillInBlank: tile ids in blank order round-trips', () => {
  assert.equal(serverGrade(8, fillBlank, blanksAnswer([U(15), U(16)])), true);
  assert.equal(serverGrade(8, fillBlank, blanksAnswer([U(16), U(15)])), false);
  assert.equal(serverGrade(8, fillBlank, blanksAnswer([U(15), fillBlankDistractor])), false);
});

check('all round-trip answers are valid answer v1 within the size limits', () => {
  const all = [
    choiceAnswer([U(1)]), orderAnswer(ids(ordering)), blanksAnswer(ids(fillBlank)),
    matchAnswer({ [U(12)]: U(12) }),
  ];
  for (const a of all) {
    assert.ok(a && serverIsAnswerV1(a) && serverWithinCaps(a));
  }
});

// ---------------------------------------------------------------------------
// Builders, shapes
// ---------------------------------------------------------------------------
check('choice: an empty selection is still an attempt', () => {
  assert.deepEqual(choiceAnswer([]), { v: 1, type: 'choice', selected: [] });
});

check('choice: returns a copy, not the caller\'s array', () => {
  const src = [U(1)];
  const a = choiceAnswer(src) as any;
  src.push(U(2));
  assert.deepEqual(a.selected, [U(1)]);
});

check('null / undefined input -> null (no attempt)', () => {
  assert.equal(choiceAnswer(null), null);
  assert.equal(orderAnswer(undefined), null);
  assert.equal(matchAnswer(null), null);
  assert.equal(blanksAnswer(undefined), null);
  assert.equal(countsAnswer(null), null);
  assert.equal(textAnswer(undefined), null);
  assert.equal(fractionAnswer(null), null);
});

check('match: empty and missing targets are left out', () => {
  assert.deepEqual(matchAnswer({ [U(1)]: '', [U(2)]: undefined, [U(3)]: U(3) }), {
    v: 1, type: 'match', pairs: { [U(3)]: U(3) },
  });
});

check('counts: option id -> tap count (templates 19-20)', () => {
  assert.deepEqual(countsAnswer({ [U(1)]: 3, [U(2)]: 0 }), {
    v: 1, type: 'counts', counts: { [U(1)]: 3, [U(2)]: 0 },
  });
  assert.equal(countsAnswer({ [U(1)]: -1 }), null);
  assert.equal(countsAnswer({ [U(1)]: 1.5 }), null);
  assert.equal(countsAnswer({ [U(1)]: '2' as any }), null);
});

check('text: keeps Khmer text and Khmer digits as typed (templates 21-23)', () => {
  const typed = { [U(1)]: 'ខ្ញុំស្រឡាញ់កម្ពុជា', [U(2)]: '១២៣' };
  assert.deepEqual(textAnswer(typed), { v: 1, type: 'text', entries: typed });
});

check('text: empty entries are left out; nothing typed -> null (templates 21-23)', () => {
  // Template 21, one blank left empty: that entry is omitted, the rest kept.
  assert.deepEqual(textAnswer({ [U(1)]: 'ស្រឡាញ់', [U(2)]: '', [U(3)]: '   ' }), {
    v: 1, type: 'text', entries: { [U(1)]: 'ស្រឡាញ់' },
  });
  // Template 22 submitted without typing: no attempt.
  assert.equal(textAnswer({ [U(5)]: '' }), null);
  assert.equal(textAnswer({ [U(5)]: undefined }), null);
  assert.equal(textAnswer({}), null);
});

check('empty string is rejected by the server validator mirror', () => {
  const bad: any = { v: 1, type: 'text', entries: { [U(1)]: '' } };
  assert.equal(serverIsAnswerV1(bad), true); // shape check alone accepts it...
  assert.equal(serverWithinCaps(bad), false); // ...the joi rule does not
  assert.equal(serverWithinCaps({ v: 1, type: 'fraction', parts: { [U(1)]: { numerator: '2', denominator: '' } } }), false);
  assert.equal(serverWithinCaps({ v: 1, type: 'choice', selected: [''] }), false);
});

check('guard: an answer containing an empty string is never returned', () => {
  assert.equal(noEmptyStrings({ v: 1, type: 'text', entries: { [U(1)]: '' } }), null);
  assert.equal(noEmptyStrings({ v: 1, type: 'choice', selected: [''] }), null);
  assert.equal(noEmptyStrings({ v: 1, type: 'match', pairs: { '': U(1) } }), null);
  assert.equal(noEmptyStrings(null), null);
  const ok: AnswerV1 = { v: 1, type: 'choice', selected: [U(1)] };
  assert.equal(noEmptyStrings(ok), ok);
});

check('fraction: typed parts are sent (template 24)', () => {
  assert.deepEqual(
    fractionAnswer({ [U(1)]: { numerator: '៣', denominator: '4' }, [U(2)]: { numerator: '1', denominator: '2' } }),
    {
      v: 1, type: 'fraction',
      parts: {
        [U(1)]: { numerator: '៣', denominator: '4' },
        [U(2)]: { numerator: '1', denominator: '2' },
      },
    },
  );
});

check('fraction: any empty part -> null, nothing invented (template 24)', () => {
  // Whole-number input answered correctly, e.g. 2 = ?/3: the renderer holds
  // denominatorAnswer ''. The answer is not sent (not server-graded yet).
  assert.equal(fractionAnswer({ [U(1)]: { numerator: '2', denominator: '' } }), null);
  // A static part stored as null becomes empty the same way.
  assert.equal(fractionAnswer({ [U(1)]: { numerator: null, denominator: '3' } }), null);
  assert.equal(fractionAnswer({ [U(1)]: { numerator: '1', denominator: '2' }, [U(2)]: { numerator: undefined } }), null);
  assert.equal(fractionAnswer({ [U(1)]: { numerator: '  ', denominator: '3' } }), null);
});

// ---------------------------------------------------------------------------
// Size limits: what would 400 the whole submission is dropped or shortened.
// ---------------------------------------------------------------------------
check('more than 50 entries -> null, exactly 50 kept', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => U(i + 1));
  assert.equal(choiceAnswer(many(ANSWER_MAX_ENTRIES + 1)), null);
  assert.equal(orderAnswer(many(ANSWER_MAX_ENTRIES + 1)), null);
  assert.equal(blanksAnswer(many(ANSWER_MAX_ENTRIES + 1)), null);
  const ok = orderAnswer(many(ANSWER_MAX_ENTRIES)) as any;
  assert.equal(ok.order.length, ANSWER_MAX_ENTRIES);
  const rec = (n: number) => Object.fromEntries(many(n).map(id => [id, id]));
  assert.equal(matchAnswer(rec(ANSWER_MAX_ENTRIES + 1)), null);
  assert.equal(textAnswer(rec(ANSWER_MAX_ENTRIES + 1)), null);
  assert.ok(textAnswer(rec(ANSWER_MAX_ENTRIES)));
  const counts = Object.fromEntries(many(51).map(id => [id, 1]));
  assert.equal(countsAnswer(counts), null);
});

check('an id over 200 characters -> null (ids are never truncated)', () => {
  const long = 'x'.repeat(ANSWER_MAX_STRING + 1);
  assert.equal(choiceAnswer([long]), null);
  assert.equal(matchAnswer({ [U(1)]: long }), null);
  assert.equal(matchAnswer({ [long]: U(1) }), null);
  assert.equal(countsAnswer({ [long]: 1 }), null);
  assert.ok(choiceAnswer(['x'.repeat(ANSWER_MAX_STRING)]));
});

check('typed text over 200 characters is shortened, still valid', () => {
  const khmer = 'ក'.repeat(ANSWER_MAX_STRING + 40);
  const a = textAnswer({ [U(1)]: khmer }) as any;
  assert.equal(a.entries[U(1)].length, ANSWER_MAX_STRING);
  assert.ok(serverWithinCaps(a));
  const f = fractionAnswer({ [U(1)]: { numerator: '9'.repeat(500), denominator: '1' } }) as any;
  assert.equal(f.parts[U(1)].numerator.length, ANSWER_MAX_STRING);
  assert.ok(serverWithinCaps(f));
});

check('clampText never splits a surrogate pair', () => {
  const s = 'a'.repeat(ANSWER_MAX_STRING - 1) + '😀'; // pair straddles the limit
  const out = clampText(s);
  assert.ok(out.length <= ANSWER_MAX_STRING);
  assert.equal(out, 'a'.repeat(ANSWER_MAX_STRING - 1));
});

// ---------------------------------------------------------------------------
// Queue: the answer survives storage; old items without one still send.
// ---------------------------------------------------------------------------
const practiceRes = {
  lessonpracticeid: U(100), lessonpracticequestionid: U(101), questionid: U(102),
} as any;
const quizRes = { lessonquizid: U(200), lessonquizquestionid: U(201), questionid: U(202) } as any;

check('practice/quiz result items carry the answer and it survives JSON storage', () => {
  const answer = choiceAnswer([U(1)]);
  const p = toPracticeQuestionResult(true, 2, practiceRes, answer);
  const q = toQuizQuestionResult(false, quizRes, answer);
  assert.deepEqual(JSON.parse(JSON.stringify(p)).answer, answer);
  assert.deepEqual(JSON.parse(JSON.stringify(q)).answer, answer);
  assert.equal(p.iscorrect, true);
  assert.equal(p.tries, 2);
  assert.equal(q.iscorrect, false);
});

check('no answer given: the field is omitted; null is kept as "no attempt"', () => {
  assert.equal('answer' in toPracticeQuestionResult(true, 1, practiceRes), false);
  assert.equal('answer' in toQuizQuestionResult(true, quizRes), false);
  assert.equal(toQuizQuestionResult(true, quizRes, null).answer, null);
});

check('an old queued item (no answer) is unchanged by a JSON round trip', () => {
  const old = { iscorrect: true, tries: 1, lessonpracticeid: U(1), lessonpracticequestionid: U(2), questionid: U(3) };
  assert.deepEqual(JSON.parse(JSON.stringify(old)), old);
});

console.log(`answerV1: ${passed} checks passed`);
