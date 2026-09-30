/**
 * Corporate fill in the blank (template 8): the state machine (fill, empty,
 * active blank), Submit gating, the sentence layout, the marks, and grading
 * equal to today's renderer for every filling. The three-way check with the
 * server's grader is in `yarn test:answer`.
 *
 * Plain script run by `tsx` (package.json `test:fillblank`). Exits non-zero
 * on the first failed check.
 */
import assert from 'node:assert/strict';
import _ from 'lodash';
import { blanksAnswer } from '../../../../utils/answerV1';
import { gradeFillBlank } from '../../Components/FillBlank/fillBlankGrade';
import {
  answerBlanks,
  BlankState,
  blankSlotState,
  emptyBlanks,
  evaluateFillBlank,
  fillActive,
  groupUnit,
  isReady,
  isUsed,
  parseSentence,
  tapBlank,
} from '../FillBlank/fillBlankLogic';
import { INITIAL_SHELL_STATE, shellPress } from '../shellLogic';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

interface Opt {
  questionoptionid: string;
  questionoptiontext: string;
  questionoptioniscorrect?: boolean;
  questionoptionsequence?: number;
}
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const real = (n: number, text: string, seq: number): Opt => ({
  questionoptionid: U(n),
  questionoptiontext: text,
  questionoptioniscorrect: true,
  questionoptionsequence: seq,
});
// A distractor as fromQuestionDistractorToQuestionOption builds it: its own
// id, iscorrect false, no sequence.
const distractor = (n: number, text: string): Opt => ({
  questionoptionid: U(n),
  questionoptiontext: text,
  questionoptioniscorrect: false,
});

const A = real(1, 'income', 1);
const B = real(2, 'expenses', 2);
const D1 = distractor(3, 'savings');
const D2 = distractor(4, 'rent');
// "Your profit is your ----- minus your -----."
const TWO: Opt[] = [A, B];
const BANKS: Opt[][] = [
  [A, B, D1], // 3 tiles, one distractor
  [A, B, D1, D2], // 4 tiles, two distractors
];

/**
 * PracticeFillBlank's submit, as it was written inline before it moved to
 * fillBlankGrade.ts. Kept verbatim (minus console.log) so a change to the
 * shared rule shows here.
 */
function kidsSubmitAsBefore(questionOptions: Opt[], selections: Opt[]) {
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
  return {
    isCorrect,
    answer: blanksAnswer(_.map(selections, o => o.questionoptionid)),
  };
}

/** Kids: a tap appends the word (no more than the blanks). */
function kidsTaps(required: number, taps: Opt[]) {
  const sel: Opt[] = [];
  for (const t of taps) if (sel.length < required && !sel.includes(t)) sel.push(t);
  return sel;
}
/** Corporate: the same taps through the state machine. */
function corpTaps(required: number, taps: Opt[]): BlankState {
  let s = emptyBlanks(required);
  for (const t of taps) s = fillActive(s, t.questionoptionid);
  return s;
}

/** Every ordered filling of `required` blanks from the bank, and every partial one. */
function fillings(bank: Opt[], required: number): Opt[][] {
  const out: Opt[][] = [[]];
  const walk = (prefix: Opt[], rest: Opt[]) => {
    if (prefix.length === required) return;
    rest.forEach((o, i) => {
      const seq = [...prefix, o];
      out.push(seq);
      walk(seq, [...rest.slice(0, i), ...rest.slice(i + 1)]);
    });
  };
  walk([], bank);
  return out;
}

// ---------------------------------------------------------------------------
// The state machine
// ---------------------------------------------------------------------------

check('a fresh question: every blank empty, the first is active', () => {
  const s = emptyBlanks(3);
  assert.deepEqual(s, { filled: [null, null, null], active: 0 });
});

check('tapping a word fills the active blank and the active blank moves on', () => {
  let s = emptyBlanks(3);
  s = fillActive(s, 'a');
  assert.deepEqual(s, { filled: ['a', null, null], active: 1 });
  s = fillActive(s, 'b');
  assert.deepEqual(s, { filled: ['a', 'b', null], active: 2 });
  s = fillActive(s, 'c');
  assert.deepEqual(s.filled, ['a', 'b', 'c']);
});

check('a word already in a blank cannot fill another', () => {
  let s = fillActive(emptyBlanks(2), 'a');
  assert.equal(fillActive(s, 'a'), s);
});

check('with every blank full, a tapped word does nothing', () => {
  const s = fillActive(fillActive(emptyBlanks(2), 'a'), 'b');
  assert.equal(fillActive(s, 'c'), s);
});

check('tapping a filled blank empties it, returns the word and makes it active', () => {
  let s = fillActive(fillActive(fillActive(emptyBlanks(3), 'a'), 'b'), 'c');
  s = tapBlank(s, 1);
  assert.deepEqual(s, { filled: ['a', null, 'c'], active: 1 });
  assert.equal(isUsed(s.filled, 'b'), false, 'the word is back in the bank');
  // The freed word fills the same blank again.
  s = fillActive(s, 'b');
  assert.deepEqual(s.filled, ['a', 'b', 'c']);
});

check('tapping an empty blank makes it active, and words then go there', () => {
  let s = emptyBlanks(3);
  s = tapBlank(s, 2);
  assert.equal(s.active, 2);
  s = fillActive(s, 'x');
  assert.deepEqual(s.filled, [null, null, 'x']);
  assert.equal(s.active, 0, 'moves on to the first empty blank (wrapping)');
  s = fillActive(s, 'y');
  assert.deepEqual(s, { filled: ['y', null, 'x'], active: 1 });
});

check('the active blank moves forward before it wraps', () => {
  let s = emptyBlanks(4);
  s = tapBlank(s, 1);
  s = fillActive(s, 'a'); // blank 1 filled -> next empty after 1 is 2
  assert.equal(s.active, 2);
});

check('tapping the active empty blank changes nothing; an out-of-range tap is ignored', () => {
  const s = emptyBlanks(2);
  assert.equal(tapBlank(s, 0), s);
  assert.equal(tapBlank(s, 5), s);
  assert.equal(tapBlank(s, -1), s);
});

check('Show answer: every blank holds its right word, in sequence order', () => {
  const C = real(6, 'tax', 3);
  const s = answerBlanks([C, A, B]);
  assert.deepEqual(s.filled, [A.questionoptionid, B.questionoptionid, C.questionoptionid]);
  assert.equal(isReady(s.filled), true);
});

check('blank looks: active, empty, filled, and the marks after submit', () => {
  const marks = { [A.questionoptionid]: 'correct', [B.questionoptionid]: 'incorrect' } as const;
  assert.equal(blankSlotState({ tileId: null, index: 0, active: 0, marks: null, showAnswer: false }), 'active');
  assert.equal(blankSlotState({ tileId: null, index: 1, active: 0, marks: null, showAnswer: false }), 'empty');
  assert.equal(blankSlotState({ tileId: 'x', index: 1, active: 0, marks: null, showAnswer: false }), 'filled');
  assert.equal(blankSlotState({ tileId: A.questionoptionid, index: 0, active: 0, marks, showAnswer: false }), 'correct');
  assert.equal(blankSlotState({ tileId: B.questionoptionid, index: 1, active: 0, marks, showAnswer: false }), 'incorrect');
  assert.equal(blankSlotState({ tileId: A.questionoptionid, index: 0, active: -1, marks: null, showAnswer: true }), 'correct');
});

// ---------------------------------------------------------------------------
// Submit gating
// ---------------------------------------------------------------------------

check('ready only when every blank is filled', () => {
  assert.equal(isReady([null, null]), false);
  assert.equal(isReady(['a', null]), false);
  assert.equal(isReady([null, 'b']), false);
  assert.equal(isReady(['a', 'b']), true);
  // Emptying a blank takes readiness away again.
  const full = fillActive(fillActive(emptyBlanks(2), 'a'), 'b');
  assert.equal(isReady(full.filled), true);
  assert.equal(isReady(tapBlank(full, 0).filled), false);
});

check('the shell refuses Submit until the blanks are full, and accepts it after', () => {
  const evaluate = () => evaluateFillBlank(TWO, BANKS[0], full.filled);
  let s = fillActive(emptyBlanks(2), A.questionoptionid);
  const full = fillActive(s, B.questionoptionid);
  const press = (b: BlankState) =>
    shellPress(INITIAL_SHELL_STATE, 'submit', {
      mode: 'practice',
      ready: isReady(b.filled),
      armed: true,
      evaluate,
    });
  assert.notEqual(press(emptyBlanks(2)).effect.kind, 'submit');
  assert.notEqual(press(s).effect.kind, 'submit');
  assert.equal(press(full).effect.kind, 'submit');
});

// ---------------------------------------------------------------------------
// Grading: the same as today's renderer, for every filling
// ---------------------------------------------------------------------------

for (const [b, bank] of BANKS.entries()) {
  check(`bank ${b + 1} (${bank.length} tiles): iscorrect and answer equal today's renderer for every filling`, () => {
    let n = 0;
    let right = 0;
    for (const taps of fillings(bank, 2)) {
      const kids = kidsSubmitAsBefore(TWO, kidsTaps(2, taps));
      const shared = gradeFillBlank(TWO, kidsTaps(2, taps));
      assert.deepEqual(shared, kids, 'the shared rule is the old inline one');
      const state = corpTaps(2, taps);
      // The same final filling: the words in blank order are the tap order.
      assert.deepEqual(
        state.filled.filter(f => f !== null),
        kidsTaps(2, taps).map(o => o.questionoptionid),
      );
      if (taps.length < 2) continue; // Submit is not offered
      const corp = evaluateFillBlank(TWO, bank, state.filled);
      assert.equal(corp.iscorrect, kids.isCorrect);
      assert.deepEqual(corp.answer, kids.answer);
      if (corp.iscorrect) right++;
      n++;
    }
    assert.ok(n >= 6, `tried ${n} fillings`);
    assert.equal(right, 1, 'exactly one filling is right');
  });
}

check('the same filling reached by emptying and refilling grades the same', () => {
  const bank = BANKS[1];
  const direct = corpTaps(2, [A, B]);
  // Fill wrong, take both back out, fill right; and fill via tapping blank 2 first.
  let s = emptyBlanks(2);
  s = fillActive(fillActive(s, D1.questionoptionid), D2.questionoptionid);
  s = tapBlank(tapBlank(s, 1), 0);
  s = fillActive(fillActive(s, A.questionoptionid), B.questionoptionid);
  assert.deepEqual(s.filled, direct.filled);
  let t = tapBlank(emptyBlanks(2), 1);
  t = fillActive(fillActive(t, B.questionoptionid), A.questionoptionid);
  assert.deepEqual(t.filled, direct.filled);
  assert.deepEqual(evaluateFillBlank(TWO, bank, s.filled), evaluateFillBlank(TWO, bank, direct.filled));
  assert.equal(evaluateFillBlank(TWO, bank, direct.filled).iscorrect, true);
});

check('one-blank and three-blank questions grade as today too', () => {
  const one = [A];
  const three = [real(1, 'a', 1), real(2, 'b', 2), real(3, 'c', 3)];
  const d = distractor(9, 'z');
  for (const [opts, bank] of [
    [one, [A, d]],
    [three, [...three, d]],
  ] as const) {
    for (const taps of fillings([...bank], opts.length)) {
      if (taps.length < opts.length) continue;
      const kids = kidsSubmitAsBefore([...opts], kidsTaps(opts.length, taps));
      const corp = evaluateFillBlank(opts, bank, corpTaps(opts.length, taps).filled);
      assert.equal(corp.iscorrect, kids.isCorrect);
      assert.deepEqual(corp.answer, kids.answer);
    }
  }
});

check('the answer is tile ids in blank order; a distractor keeps its own id', () => {
  const e = evaluateFillBlank(TWO, BANKS[0], [B.questionoptionid, D1.questionoptionid]);
  assert.deepEqual(e.answer, { v: 1, type: 'blanks', filled: [B.questionoptionid, D1.questionoptionid] });
  assert.equal(e.iscorrect, false);
});

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

check('marks: each blank by its own word; a wrong answer does not reveal the right one', () => {
  const e = evaluateFillBlank(TWO, BANKS[0], [D1.questionoptionid, B.questionoptionid]);
  assert.deepEqual(e.perItem, { [D1.questionoptionid]: 'incorrect', [B.questionoptionid]: 'correct' });
  assert.deepEqual(e.summary, { correctCount: 1, total: 2 });
  const swapped = evaluateFillBlank(TWO, BANKS[0], [B.questionoptionid, A.questionoptionid]);
  assert.deepEqual(swapped.perItem, { [B.questionoptionid]: 'incorrect', [A.questionoptionid]: 'incorrect' });
  const right = evaluateFillBlank(TWO, BANKS[0], [A.questionoptionid, B.questionoptionid]);
  assert.deepEqual(right.perItem, { [A.questionoptionid]: 'correct', [B.questionoptionid]: 'correct' });
  assert.deepEqual(right.summary, { correctCount: 2, total: 2 });
});

check('marks: a word in the right place that is not a correct option is wrong, as graded', () => {
  // Data slip: a distractor-like tile that carries the sequence of the second blank.
  const trap: Opt = { questionoptionid: U(7), questionoptiontext: 'trap', questionoptioniscorrect: false, questionoptionsequence: 2 };
  const e = evaluateFillBlank(TWO, [A, B, trap], [A.questionoptionid, trap.questionoptionid]);
  assert.equal(e.iscorrect, false);
  assert.deepEqual(e.perItem, { [A.questionoptionid]: 'correct', [trap.questionoptionid]: 'incorrect' });
});

check('every blank marked right exactly when iscorrect, for every filling', () => {
  for (const bank of BANKS) {
    for (const taps of fillings(bank, 2)) {
      if (taps.length < 2) continue;
      const e = evaluateFillBlank(TWO, bank, corpTaps(2, taps).filled);
      const all = Object.values(e.perItem).every(m => m === 'correct') && Object.keys(e.perItem).length === 2;
      assert.equal(all, e.iscorrect);
      assert.equal(e.summary?.correctCount, Object.values(e.perItem).filter(m => m === 'correct').length);
    }
  }
});

// ---------------------------------------------------------------------------
// The sentence
// ---------------------------------------------------------------------------

const shape = (units: ReturnType<typeof parseSentence>) =>
  units.map(u => u.map(p => (p.kind === 'blank' ? `[${p.index}]` : p.text)).join(''));

check('English: words are units, a blank keeps the full stop that follows it', () => {
  assert.deepEqual(
    shape(parseSentence('Your profit is your ----- minus your -----.', 2)),
    ['Your', 'profit', 'is', 'your', '[0]', 'minus', 'your', '[1].'],
  );
});

check('Khmer: text with no spaces stays whole and breaks only at a blank or a space', () => {
  const km = 'ប្រាក់ចំណេញ គឺប្រាក់ចំណូល----- ចំណាយ។';
  // The marker is 5 hyphens: no space around it here, so it joins its neighbours.
  assert.deepEqual(shape(parseSentence(km, 1)), ['ប្រាក់ចំណេញ', 'គឺប្រាក់ចំណូល[0]', 'ចំណាយ។']);
  assert.deepEqual(
    shape(parseSentence('ប្រាក់ចំណេញ គឺ ----- ចំណាយ។', 1)),
    ['ប្រាក់ចំណេញ', 'គឺ', '[0]', 'ចំណាយ។'],
  );
});

check('a sentence that starts or ends with a blank', () => {
  assert.deepEqual(shape(parseSentence('----- is here', 1)), ['[0]', 'is', 'here']);
  assert.deepEqual(shape(parseSentence('It is -----', 1)), ['It', 'is', '[0]']);
});

check('markers beyond the blanks stay as text; missing markers add blanks at the end', () => {
  assert.deepEqual(shape(parseSentence('a ----- b -----', 1)), ['a', '[0]', 'b', '_____']);
  assert.deepEqual(shape(parseSentence('a b', 2)), ['a', 'b', '[0]', '[1]']);
  assert.deepEqual(shape(parseSentence(null, 1)), ['[0]']);
  assert.deepEqual(shape(parseSentence('', 0)), []);
});

check('every blank appears exactly once, numbered in order', () => {
  const idx = parseSentence('x ----- y ----- z -----', 3).flat().filter(p => p.kind === 'blank').map(p => (p as any).index);
  assert.deepEqual(idx, [0, 1, 2]);
});

check('a blank keeps the short text after it; long text and other blanks are separate groups', () => {
  const g = (t: string, n: number) =>
    parseSentence(t, n).map(u => groupUnit(u).map(x => x.map(p => (p.kind === 'blank' ? `[${p.index}]` : p.text)).join('')));
  assert.deepEqual(g('ប្រាក់ចំណេញរបស់អ្នកគឺ-----ដក-----។', 2), [['ប្រាក់ចំណេញរបស់អ្នកគឺ', '[0]ដក', '[1]។']]);
  assert.deepEqual(g('a -----.', 1), [['a'], ['[0].']]);
  assert.deepEqual(g('-----abcdef', 1), [['[0]', 'abcdef']], 'longer text is not glued');
  assert.deepEqual(g('a-----b', 0), [['a', '_____', 'b']], 'text is only glued to a blank');
  assert.deepEqual(g('----------', 2), [['[0]', '[1]']], 'two blanks stay apart');
});

console.log(`fillBlank: ${passed} checks passed`);
