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
import _ from 'lodash';
import { gradeMcqText } from '../../screens/Practice/Components/MCQText/mcqTextGrade';
import {
  evaluateMcqText,
  toggleSelection,
} from '../../screens/Practice/Corporate/mcqTextLogic';
import { gradeArrangeText } from '../../screens/Practice/Components/ArrangeText/arrangeTextGrade';
import { evaluateTextOrdering } from '../../screens/Practice/Corporate/textOrderingLogic';
import { gradeFillBlank } from '../../screens/Practice/Components/FillBlank/fillBlankGrade';
import { emptyBlanks, evaluateFillBlank, fillActive, tapBlank } from '../../screens/Practice/Corporate/FillBlank/fillBlankLogic';
import { gradeMatching } from '../../screens/Practice/Components/DragDrop/matchingGrade';
import { evaluateMatching } from '../../screens/Practice/Corporate/matchingLogic';
import { INITIAL_SHELL_STATE, shellPress } from '../../screens/Practice/Corporate/shellLogic';
import { gradeArrangeImage } from '../../screens/Practice/Components/ArrangeImage/arrangeImageGrade';
import { evaluateImageOrdering } from '../../screens/Practice/Corporate/ImageOrdering/imageOrderingLogic';
import {
  selectionModeFor,
  selectOption,
} from '../../screens/Practice/Corporate/selectionMode';

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

// ---------------------------------------------------------------------------
// Corporate multiple choice, text (templates 1 and 3): for the same taps,
// the corporate shell sends exactly what the kids renderer sends. Every
// ordered selection sequence over the fixtures is tried.
// ---------------------------------------------------------------------------

/**
 * PracticeMCQText's submit, as it was written inline before it moved to
 * mcqTextGrade.ts. Kept verbatim here so a change to the shared rule shows.
 */
function kidsSubmitAsBefore(questionOptions: Opt[], selections: Record<string, unknown>) {
  const { isCorrect } = _.reduce(
    questionOptions,
    (result, value) => {
      if (value.questionoptioniscorrect && _.isEmpty(selections[value.questionoptionid]))
        result.isCorrect = false;
      else if (!value.questionoptioniscorrect && !_.isEmpty(selections[value.questionoptionid]))
        result.isCorrect = false;
      return result;
    },
    { isCorrect: true },
  );
  return { isCorrect, answer: B.choiceAnswer(_.keys(_.pickBy(selections, v => !_.isEmpty(v)))) };
}

/** Every ordered sequence of distinct taps (a tap selects; the tapped option is the value). */
function tapSequences(options: Opt[]): Opt[][] {
  const out: Opt[][] = [[]];
  const walk = (prefix: Opt[], rest: Opt[]) => {
    rest.forEach((o, i) => {
      const seq = [...prefix, o];
      out.push(seq);
      walk(seq, [...rest.slice(0, i), ...rest.slice(i + 1)]);
    });
  };
  walk([], options);
  return out;
}

/** The selections each path holds after a sequence of taps (a second tap unselects). */
function kidsSelections(taps: Opt[]) {
  // PracticeMCQText.handleItemPress
  let selections: Record<string, Opt> = {};
  for (const qp of taps) {
    if (!_.isEmpty(selections[qp.questionoptionid])) {
      const old = selections;
      delete old[qp.questionoptionid];
      selections = old;
    } else selections = { ...selections, [qp.questionoptionid]: qp };
  }
  return selections;
}
function corporateSelections(taps: Opt[]) {
  let selections: Record<string, Opt> = {};
  for (const qp of taps) selections = toggleSelection(selections, qp.questionoptionid, qp);
  return selections;
}

const pressSubmit = (selections: Record<string, Opt>, options: Opt[], mode: 'practice' | 'quiz', tries: number) =>
  shellPress({ ...INITIAL_SHELL_STATE, tries }, 'submit', {
    mode,
    ready: true,
    evaluate: () => evaluateMcqText(options, selections),
  });

for (const [templateId, options] of [[1, singleChoice], [3, multiChoice]] as const) {
  check(`corporate MCQ text, template ${templateId}: answer and iscorrect equal the kids path for every tap sequence`, () => {
    const sequences = tapSequences(options as Opt[]);
    // Taps that also unselect: tap the first option again at the end.
    const withUntap = sequences.filter(s => s.length > 1).map(s => [...s, s[0]]);
    let n = 0;
    for (const taps of [...sequences, ...withUntap]) {
      const kSel = kidsSelections(taps);
      const cSel = corporateSelections(taps);
      assert.deepEqual(Object.keys(cSel), Object.keys(kSel), 'same selection order');
      const kids = kidsSubmitAsBefore(options as Opt[], kSel);
      const shared = gradeMcqText(options as Opt[], kSel);
      const corp = evaluateMcqText(options as Opt[], cSel);
      assert.deepEqual(shared, kids, 'the shared rule is the old inline one');
      assert.equal(corp.iscorrect, kids.isCorrect);
      assert.deepEqual(corp.answer, kids.answer);
      noEmpty(corp.answer);
      // The server grades the corporate answer the same way the device did.
      assert.equal(serverGrade(templateId, options as Opt[], corp.answer), corp.iscorrect);

      // What the shell hands the screen is what the kids renderer handed it,
      // so the result items the screens build are identical too.
      for (const tries of [1, 2, 3]) {
        const practice = pressSubmit(cSel, options as Opt[], 'practice', tries);
        const quiz = pressSubmit(cSel, options as Opt[], 'quiz', 1);
        assert.equal(practice.effect.kind, 'submit');
        assert.equal(quiz.effect.kind, 'submit');
        if (practice.effect.kind !== 'submit' || quiz.effect.kind !== 'submit') return;
        assert.deepEqual(
          toPracticeQuestionResult(practice.effect.iscorrect, practice.effect.tries, practiceRes, practice.effect.answer),
          toPracticeQuestionResult(kids.isCorrect, tries, practiceRes, kids.answer),
        );
        assert.deepEqual(
          toQuizQuestionResult(quiz.effect.iscorrect, quizRes, quiz.effect.answer),
          toQuizQuestionResult(kids.isCorrect, quizRes, kids.answer),
        );
      }
      n++;
    }
    assert.ok(n > 10, `tried ${n} sequences`);
  });
}

check('corporate MCQ text marks: chosen options only, by their own correctness', () => {
  const sel = corporateSelections([singleChoice[1]]);
  assert.deepEqual(evaluateMcqText(singleChoice, sel).perItem, { [U(2)]: 'incorrect' });
  const right = corporateSelections([multiChoice[2], multiChoice[0]]);
  assert.deepEqual(evaluateMcqText(multiChoice, right).perItem, { [U(6)]: 'correct', [U(4)]: 'correct' });
});

// ---------------------------------------------------------------------------
// Corporate word ordering (template 5): for the same final order, the
// corporate shell sends exactly what the kids renderer sends. Every
// permutation of 3 and 4 words is tried, plus a fixture with equal sequences.
// ---------------------------------------------------------------------------

/**
 * PracticeArrangeText's submit, as it was written inline before it moved to
 * arrangeTextGrade.ts. Kept verbatim here so a change to the shared rule shows.
 */
function kidsOrderSubmitAsBefore(options: Opt[], selections: Opt[]) {
  let isCorrect = true;
  if (Object.values(selections).length !== options.length) isCorrect = false;
  else {
    const answers = Object.values(selections);
    const { correct } = _.reduce(
      answers,
      (result, value) => {
        if ((value.questionoptionsequence as number) < result.currentSequence) result.correct = false;
        result.currentSequence = value.questionoptionsequence as number;
        return result;
      },
      { correct: true, currentSequence: 0 },
    );
    isCorrect = correct;
  }
  return { isCorrect, answer: B.orderAnswer(_.map(selections, o => o.questionoptionid)) };
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
}

const ordering3 = ordering.slice(0, 3);
const orderingTied = [opt(30, 'ក', true, 1), opt(31, 'ខ', true, 2), opt(32, 'គ', true, 2), opt(33, 'ឃ', true, 3)];

for (const [label, options] of [['3 words', ordering3], ['4 words', ordering], ['4 words, two with equal sequence', orderingTied]] as const) {
  check(`corporate word ordering, ${label}: answer and iscorrect equal the kids path for every order`, () => {
    let n = 0;
    let right = 0;
    for (const perm of permutations([...options] as Opt[])) {
      const ids = perm.map(o => o.questionoptionid);
      const kids = kidsOrderSubmitAsBefore(options as Opt[], perm);
      const shared = gradeArrangeText(options, perm as never);
      const corp = evaluateTextOrdering(options as never, ids);
      assert.deepEqual(shared, kids, 'the shared rule is the old inline one');
      assert.equal(corp.iscorrect, kids.isCorrect);
      assert.deepEqual(corp.answer, kids.answer);
      assert.deepEqual(corp.answer, { v: 1, type: 'order', order: ids });
      noEmpty(corp.answer);
      // The server grades the corporate answer the same way the device did.
      assert.equal(serverGrade(5, options as Opt[], corp.answer), corp.iscorrect);
      // What the shell hands the screen is what the kids renderer handed it.
      const practice = shellPress({ ...INITIAL_SHELL_STATE, tries: 2 }, 'submit', {
        mode: 'practice',
        ready: true,
        evaluate: () => evaluateTextOrdering(options as never, ids),
      });
      const quiz = shellPress(INITIAL_SHELL_STATE, 'submit', {
        mode: 'quiz',
        ready: true,
        evaluate: () => evaluateTextOrdering(options as never, ids),
      });
      assert.equal(practice.effect.kind, 'submit');
      assert.equal(quiz.effect.kind, 'submit');
      if (practice.effect.kind !== 'submit' || quiz.effect.kind !== 'submit') return;
      assert.deepEqual(
        toPracticeQuestionResult(practice.effect.iscorrect, practice.effect.tries, practiceRes, practice.effect.answer),
        toPracticeQuestionResult(kids.isCorrect, 2, practiceRes, kids.answer),
      );
      assert.deepEqual(
        toQuizQuestionResult(quiz.effect.iscorrect, quizRes, quiz.effect.answer),
        toQuizQuestionResult(kids.isCorrect, quizRes, kids.answer),
      );
      if (corp.iscorrect) right++;
      n++;
    }
    assert.ok(n >= 6, `tried ${n} orders`);
    assert.ok(right >= 1 && right < n, `${right} of ${n} orders grade correct`);
  });
}

check('the shared word-ordering rule equals the old inline one for partial and empty placements too', () => {
  for (const options of [ordering, orderingTied] as Opt[][]) {
    const seqs = options.flatMap(o => permutations(options).flatMap(p => [p.slice(0, 0), p.slice(0, 2), p.slice(0, 3)]));
    for (const sel of seqs) {
      assert.deepEqual(gradeArrangeText(options, sel as never), kidsOrderSubmitAsBefore(options, sel));
    }
  }
});


// ---------------------------------------------------------------------------
// Corporate fill in the blank (template 8): for the same final filling, the
// corporate shell sends exactly what the kids renderer sends, and the
// server's grader agrees with both. Every filling of the blanks from the
// bank (real options and distractors) is tried, by tapping words in and by
// emptying and refilling.
// ---------------------------------------------------------------------------

/**
 * PracticeFillBlank's submit, as it was written inline before it moved to
 * fillBlankGrade.ts. Kept verbatim here so a change to the shared rule shows.
 */
function kidsFillBlankAsBefore(questionOptions: Opt[], selections: Opt[]) {
  const requiredNumberOfAnswer = questionOptions.length;
  let isCorrect = false;
  if (selections.length < requiredNumberOfAnswer) isCorrect = false;
  else {
    const { correct } = _.reduce(
      selections,
      (result, value) => {
        if (
          (!_.isBoolean(value.questionoptioniscorrect) && questionOptions.length > 1) ||
          !_.isNumber(value.questionoptionsequence)
        ) {
          result.correct = false;
        } else if (value.questionoptionsequence < result.currentSequence) {
          result.correct = false;
        } else if (!value.questionoptioniscorrect && questionOptions.length > 1) {
          result.correct = false;
        }
        result.currentSequence = value.questionoptionsequence as number;
        return result;
      },
      { correct: true, currentSequence: 0 },
    );
    isCorrect = correct;
  }
  return { isCorrect, answer: B.blanksAnswer(_.map(selections, o => o.questionoptionid)) };
}

// A distractor as fromQuestionDistractorToQuestionOption builds it.
const distract = (n: number, text: string): Opt => ({
  questionoptionid: U(n),
  questionoptiontext: text,
  questionoptioniscorrect: false,
});
const distractorA = distract(17, 'ស្អប់');
const distractorB = distract(18, 'ភ្លេច');

for (const [label, bank] of [
  ['3 tiles, one distractor', [...fillBlank, distractorA]],
  ['4 tiles, two distractors', [...fillBlank, distractorA, distractorB]],
] as const) {
  check(`corporate fill in the blank, ${label}: answer and iscorrect equal the kids path and the server for every filling`, () => {
    let n = 0;
    let right = 0;
    for (const first of bank) {
      for (const second of bank) {
        if (first === second) continue;
        // The kids renderer appends taps; corporate fills the active blank.
        const kids = kidsFillBlankAsBefore(fillBlank, [first, second]);
        assert.deepEqual(gradeFillBlank(fillBlank, [first, second]), kids, 'the shared rule is the old inline one');

        // Path 1: tap the two words in order. Path 2: tap blank 2, place the
        // second word, then the first (active moves back to blank 1). Path 3:
        // fill both wrong, empty both, refill.
        const tap = (s = emptyBlanks(2), ...w: Opt[]) => w.reduce((st, o) => fillActive(st, o.questionoptionid), s);
        const p1 = tap(undefined, first, second);
        const p2 = tap(tapBlank(emptyBlanks(2), 1), second, first);
        const junk = bank.filter(o => o !== first && o !== second);
        const p3 = tap(tapBlank(tapBlank(tap(undefined, junk[0] ?? second, junk[1] ?? first), 1), 0), first, second);
        for (const path of [p1, p2, p3]) {
          assert.deepEqual(path.filled, [first.questionoptionid, second.questionoptionid]);
          const corp = evaluateFillBlank(fillBlank, bank, path.filled);
          assert.equal(corp.iscorrect, kids.isCorrect);
          assert.deepEqual(corp.answer, kids.answer);
          noEmpty(corp.answer);
          // The server grades the corporate answer the same way the device did.
          assert.equal(serverGrade(8, fillBlank, corp.answer), corp.iscorrect);
          if (corp.iscorrect) right++;
          // The marks agree with the grade.
          const all = Object.values(corp.perItem).every(m => m === 'correct') && Object.keys(corp.perItem).length === 2;
          assert.equal(all, corp.iscorrect);
        }
        n++;
      }
    }
    assert.equal(n, bank.length * (bank.length - 1));
    assert.equal(right, 3, 'only the right filling is right (on each of the three paths)');
  });
}

check('corporate fill in the blank: what the shell hands the screen equals the kids result items', () => {
  const bank = [...fillBlank, distractorA];
  for (const [first, second] of [[fillBlank[0], fillBlank[1]], [fillBlank[1], distractorA]]) {
    const kids = kidsFillBlankAsBefore(fillBlank, [first, second]);
    const filled = [first.questionoptionid, second.questionoptionid];
    for (const tries of [1, 2, 3]) {
      const practice = shellPress({ ...INITIAL_SHELL_STATE, tries }, 'submit', {
        mode: 'practice', ready: true, evaluate: () => evaluateFillBlank(fillBlank, bank, filled),
      });
      const quiz = shellPress(INITIAL_SHELL_STATE, 'submit', {
        mode: 'quiz', ready: true, evaluate: () => evaluateFillBlank(fillBlank, bank, filled),
      });
      assert.equal(practice.effect.kind, 'submit');
      assert.equal(quiz.effect.kind, 'submit');
      if (practice.effect.kind !== 'submit' || quiz.effect.kind !== 'submit') return;
      assert.deepEqual(
        toPracticeQuestionResult(practice.effect.iscorrect, practice.effect.tries, practiceRes, practice.effect.answer),
        toPracticeQuestionResult(kids.isCorrect, tries, practiceRes, kids.answer),
      );
      assert.deepEqual(
        toQuizQuestionResult(quiz.effect.iscorrect, quizRes, quiz.effect.answer),
        toQuizQuestionResult(kids.isCorrect, quizRes, kids.answer),
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Corporate matching (template 7): for the same final pairing, the corporate
// renderer sends exactly what the kids renderer sends. Every way of putting
// distinct chips on some or all of the slots is tried, for 3 pairs and for 4
// (empty slots included: corporate blocks Submit until all are filled, but
// `evaluate()` still has to agree with the kids path when some are not).
// ---------------------------------------------------------------------------

/**
 * PracticeDragDrop's submit, as it was written inline before it moved to
 * matchingGrade.ts. Kept verbatim here so a change to the shared rule shows.
 */
function kidsMatchSubmitAsBefore(questionOptions: Opt[], answers: Record<string, string>) {
  const isCorrect = _.reduce(
    questionOptions,
    (result, value) => {
      if (
        _.isEmpty(answers[value.questionoptionid]) ||
        answers[value.questionoptionid] !== value.questionoptionid
      )
        result = false;
      return result;
    },
    true,
  );
  return { isCorrect, answer: B.matchAnswer(answers) };
}

/** Every partial injective pairing: each slot empty or holding a distinct chip. */
function pairings(ids: string[]): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const walk = (i: number, used: Set<string>, acc: Record<string, string>) => {
    if (i === ids.length) return void out.push({ ...acc });
    walk(i + 1, used, acc); // slot i left empty
    for (const chip of ids) {
      if (used.has(chip)) continue;
      used.add(chip);
      walk(i + 1, used, { ...acc, [ids[i]]: chip });
      used.delete(chip);
    }
  };
  walk(0, new Set(), {});
  return out;
}

for (const count of [3, 4]) {
  check(`corporate matching, ${count} pairs: answer and iscorrect equal the kids path for every pairing`, () => {
    const options: Opt[] = Array.from({ length: count }, (_x, i) =>
      opt(100 + i, `prompt ${i}`, true, i + 1),
    );
    const slotIds = ids(options);
    let n = 0;
    let correct = 0;
    for (const placed of pairings(slotIds)) {
      // The kids form keeps '' for a target whose chip was taken back.
      const kidsHeld: Record<string, string> = Object.fromEntries(slotIds.map(id => [id, placed[id] ?? '']));
      for (const held of [placed, kidsHeld]) {
        const kids = kidsMatchSubmitAsBefore(options, held);
        assert.deepEqual(gradeMatching(options, held), kids, 'the shared rule is the old inline one');
      }
      const kids = kidsMatchSubmitAsBefore(options, kidsHeld);
      const corp = evaluateMatching(options, placed);
      assert.equal(corp.iscorrect, kids.isCorrect);
      assert.deepEqual(corp.answer, kids.answer);
      noEmpty(corp.answer);
      // The server grades the corporate answer the same way the device did.
      assert.equal(serverGrade(7, options, corp.answer), corp.iscorrect);
      if (corp.iscorrect) correct += 1;
      n++;
    }
    assert.equal(correct, 1, 'exactly one pairing is right');
    assert.ok(n >= (count === 3 ? 34 : 209), `tried ${n} pairings`);
  });
}

check('corporate matching marks: placed slots only, by their own correctness', () => {
  const options = [opt(100, 'a', true, 1), opt(101, 'b', true, 2), opt(102, 'c', true, 3)];
  const ev = evaluateMatching(options, { [U(100)]: U(100), [U(101)]: U(102) });
  assert.deepEqual(ev.perItem, { [U(100)]: 'correct', [U(101)]: 'incorrect' });
  assert.deepEqual(ev.summary, { correctCount: 1, total: 3 });
});

// ---------------------------------------------------------------------------
// Corporate single-select (templates 1 and 2): a tap replaces the choice.
// For the same FINAL selection, the answer and iscorrect are exactly what
// the kids renderer sends when that option is the one left selected.
// ---------------------------------------------------------------------------

function corporateSingleSelections(taps: Opt[], mode: 'single' | 'multi') {
  let selections: Record<string, Opt> = {};
  for (const qp of taps) selections = selectOption(selections, qp.questionoptionid, qp, mode);
  return selections;
}

for (const templateId of [1, 2] as const) {
  check(`corporate single-select, template ${templateId}: every tap sequence ends in at most one option, sent exactly as kids sends it`, () => {
    const q = { questionobject: { questionoptions: singleChoice } };
    assert.equal(selectionModeFor(templateId, q), 'single');
    // Every ordered tap sequence, repeats included (a radio tapped twice), up to 4 taps.
    const seqs: Opt[][] = [[]];
    for (let len = 1; len <= 4; len++)
      for (const prev of seqs.filter(x => x.length === len - 1))
        for (const o of singleChoice) seqs.push([...prev, o as Opt]);
    let n = 0;
    for (const taps of seqs) {
      const cSel = corporateSingleSelections(taps, 'single');
      const keys = Object.keys(cSel);
      assert.ok(keys.length <= 1, 'single-select holds one option at most');
      if (taps.length) assert.deepEqual(keys, [taps[taps.length - 1].questionoptionid], 'the last tap wins');
      // Kids, arriving at the same final selection (that option tapped once).
      const kSel = kidsSelections(taps.length ? [taps[taps.length - 1]] : []);
      const kids = kidsSubmitAsBefore(singleChoice as Opt[], kSel);
      const corp = evaluateMcqText(singleChoice as Opt[], cSel);
      assert.equal(corp.iscorrect, kids.isCorrect);
      assert.deepEqual(corp.answer, kids.answer);
      assert.equal(serverGrade(templateId, singleChoice as Opt[], corp.answer), corp.iscorrect);
      const practice = pressSubmit(cSel, singleChoice as Opt[], 'practice', 1);
      assert.equal(practice.effect.kind, 'submit');
      if (practice.effect.kind !== 'submit') return;
      assert.deepEqual(
        toPracticeQuestionResult(practice.effect.iscorrect, 1, practiceRes, practice.effect.answer),
        toPracticeQuestionResult(kids.isCorrect, 1, practiceRes, kids.answer),
      );
      n++;
    }
    assert.ok(n > 100, `tried ${n} sequences`);
  });
}

check('corporate single-select fallback: a template 1 question with two correct options stays multi and can be answered right', () => {
  const bad = [opt(1, 'ក', true), opt(2, 'ខ', true), opt(3, 'គ', false)] as Opt[];
  const mode = selectionModeFor(1, { questionobject: { questionoptions: bad } });
  assert.equal(mode, 'multi');
  const sel = corporateSingleSelections([bad[1], bad[0]], mode);
  const corp = evaluateMcqText(bad, sel);
  assert.equal(corp.iscorrect, true);
  assert.deepEqual(corp.answer, kidsSubmitAsBefore(bad, kidsSelections([bad[1], bad[0]])).answer);
  // Had it been single-select, no selection could be correct.
  assert.equal(evaluateMcqText(bad, corporateSingleSelections([bad[1], bad[0]], 'single')).iscorrect, false);
});

// ---------------------------------------------------------------------------
// Corporate picture ordering (template 6): for the same final order, the
// corporate shell sends exactly what the kids renderer sends. Every
// permutation of the fixtures is tried, including one with equal sequences.
// ---------------------------------------------------------------------------

/**
 * PracticeArrangeImage's submit, as it was written inline before it moved to
 * arrangeImageGrade.ts (its console.logs dropped). Kept verbatim here so a
 * change to the shared rule shows.
 */
function kidsArrangeAsBefore(options: Opt[]) {
  const { correct } = _.reduce(
    options,
    (result, value) => {
      if ((value.questionoptionsequence as number) < result.currentSequence) result.correct = false;
      result.currentSequence = value.questionoptionsequence as number;
      return result;
    },
    { correct: true, currentSequence: 0 },
  );
  return { correct, answer: B.orderAnswer(_.map(options, o => o.questionoptionid)) };
}

function permutationsOf<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutationsOf([...xs.slice(0, i), ...xs.slice(i + 1)]).map(rest => [x, ...rest]));
}

const sixPictures = [1, 2, 3, 4, 5, 6].map(n => opt(60 + n, `រូបភាព ${n}`, true, n));
const tiedPictures = [opt(70, 'ក', true, 1), opt(71, 'ខ', true, 2), opt(72, 'គ', true, 2), opt(73, 'ឃ', true, 3)];

// Sequences of 0 and below are graded as today (the first is compared with 0).
const oddPictures = [opt(80, 'ក', true, -1), opt(81, 'ខ', true, 0), opt(82, 'គ', true, 1)];

for (const [name, options] of [['4 pictures', ordering], ['6 pictures', sixPictures], ['equal sequences', tiedPictures], ['zero and negative sequences', oddPictures]] as const) {
  check(`corporate picture ordering, ${name}: answer and iscorrect equal the kids path for every order`, () => {
    let n = 0;
    for (const perm of permutationsOf([...options] as Opt[])) {
      const ids = perm.map(o => o.questionoptionid);
      const kids = kidsArrangeAsBefore(perm);
      const shared = gradeArrangeImage(perm as any);
      const corp = evaluateImageOrdering(options as any, ids);
      assert.deepEqual(shared, kids, 'the shared rule is the old inline one');
      assert.equal(corp.iscorrect, kids.correct);
      assert.deepEqual(corp.answer, kids.answer);
      noEmpty(corp.answer);
      // The server grades the corporate answer the same way the device did.
      assert.equal(serverGrade(6, options as Opt[], corp.answer), corp.iscorrect);

      // What the shell hands the screen is what the kids renderer handed it.
      for (const tries of [1, 2, 3]) {
        const practice = shellPress({ ...INITIAL_SHELL_STATE, tries }, 'submit', {
          mode: 'practice', ready: true, evaluate: () => evaluateImageOrdering(options as any, ids),
        });
        const quiz = shellPress({ ...INITIAL_SHELL_STATE }, 'submit', {
          mode: 'quiz', ready: true, evaluate: () => evaluateImageOrdering(options as any, ids),
        });
        if (practice.effect.kind !== 'submit' || quiz.effect.kind !== 'submit') throw new Error('no submit');
        assert.deepEqual(
          toPracticeQuestionResult(practice.effect.iscorrect, practice.effect.tries, practiceRes, practice.effect.answer),
          toPracticeQuestionResult(kids.correct, tries, practiceRes, kids.answer),
        );
        assert.deepEqual(
          toQuizQuestionResult(quiz.effect.iscorrect, quizRes, quiz.effect.answer),
          toQuizQuestionResult(kids.correct, quizRes, kids.answer),
        );
      }
      n++;
    }
    assert.equal(n, _.range(1, options.length + 1).reduce((a, b) => a * b, 1));
  });
}

console.log(`answerV1: ${passed} checks passed`);
