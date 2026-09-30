/**
 * Corporate word ordering (template 5): the per-word marks, the counts for
 * the result strip, the read-back sentence, and the tile state.
 * (The check that grading equals the kids renderer's is in
 * src/utils/__tests__/answerV1.ts.)
 *
 * Plain script run by `tsx` (package.json `test:ordering`).
 */
import assert from 'node:assert/strict';
import {
  correctOrder,
  evaluateTextOrdering,
  optionsInOrder,
  readBackSentence,
  wordMarks,
  wordState,
  type OrderingOption,
} from '../textOrderingLogic';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`FAIL: ${name}`);
    throw e;
  }
}

const w = (id: string, text: string, seq: number): OrderingOption => ({
  questionoptionid: id,
  questionoptiontext: text,
  questionoptionsequence: seq,
});
const en = [w('a', 'I', 1), w('b', 'walk', 2), w('c', 'to', 3), w('d', 'school', 4)];
const km = [w('k1', 'ខ្ញុំ', 1), w('k2', 'ទៅ', 2), w('k3', 'សាលា', 3)];
const tied = [w('t1', 'a', 1), w('t2', 'b', 2), w('t3', 'c', 2), w('t4', 'd', 3)];

check('read-back: English joins with spaces, Khmer with none', () => {
  assert.equal(readBackSentence(['I', 'walk', 'to', 'school']), 'I walk to school');
  assert.equal(readBackSentence(['ខ្ញុំ', 'ទៅ', 'សាលា']), 'ខ្ញុំទៅសាលា');
  assert.equal(readBackSentence([' I ', '', 'go']), 'I go');
  assert.equal(readBackSentence([]), '');
});

check('correct order: every word right, count = total, read-back is the sentence', () => {
  const ev = evaluateTextOrdering(en, ['a', 'b', 'c', 'd']);
  assert.equal(ev.iscorrect, true);
  assert.deepEqual(ev.perItem, { a: 'correct', b: 'correct', c: 'correct', d: 'correct' });
  assert.deepEqual(ev.summary, { correctCount: 4, total: 4, readBack: 'I walk to school' });
});

check('one swap: only the two swapped words are wrong', () => {
  const ev = evaluateTextOrdering(en, ['a', 'c', 'b', 'd']);
  assert.equal(ev.iscorrect, false);
  assert.deepEqual(ev.perItem, { a: 'correct', c: 'incorrect', b: 'incorrect', d: 'correct' });
  assert.equal(ev.summary?.correctCount, 2);
  assert.equal(ev.summary?.total, 4);
});

check('reversed: marks follow position (an odd count leaves the middle right)', () => {
  const ev = evaluateTextOrdering(km, ['k3', 'k2', 'k1']);
  assert.equal(ev.iscorrect, false);
  assert.deepEqual(ev.perItem, { k3: 'incorrect', k2: 'correct', k1: 'incorrect' });
  assert.equal(ev.summary?.correctCount, 1);
});

check('Khmer sentence reads back without spaces', () => {
  assert.equal(evaluateTextOrdering(km, ['k1', 'k2', 'k3']).summary?.readBack, 'ខ្ញុំទៅសាលា');
});

check('equal sequences: either order is right, and every mark agrees with iscorrect', () => {
  for (const ids of [['t1', 't2', 't3', 't4'], ['t1', 't3', 't2', 't4']]) {
    const ev = evaluateTextOrdering(tied, ids);
    assert.equal(ev.iscorrect, true);
    assert.ok(Object.values(ev.perItem).every(m => m === 'correct'));
  }
  const bad = evaluateTextOrdering(tied, ['t2', 't1', 't3', 't4']);
  assert.equal(bad.iscorrect, false);
  assert.deepEqual(bad.perItem, { t2: 'incorrect', t1: 'incorrect', t3: 'correct', t4: 'correct' });
});

check('a mark is all-correct exactly when the order grades correct (all orders of 4)', () => {
  const perms = (xs: string[]): string[][] =>
    xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
  for (const opts of [en, tied]) {
    for (const p of perms(opts.map(o => o.questionoptionid))) {
      const ev = evaluateTextOrdering(opts, p);
      assert.equal(Object.values(ev.perItem).every(m => m === 'correct'), ev.iscorrect);
    }
  }
});

check('optionsInOrder and correctOrder', () => {
  assert.deepEqual(optionsInOrder(en, ['d', 'x', 'a']).map(o => o.questionoptionid), ['d', 'a']);
  assert.deepEqual(correctOrder([en[2], en[0], en[3], en[1]]).map(o => o.questionoptionid), ['a', 'b', 'c', 'd']);
  assert.deepEqual(wordMarks([]), {});
});

check('tile state: answer when shown, else mark, else pick', () => {
  const marks = { a: 'correct', b: 'incorrect' } as const;
  assert.equal(wordState('a', { picked: false, marks: null, showAnswer: true }), 'correct');
  assert.equal(wordState('b', { picked: true, marks: null, showAnswer: true }), 'correct');
  assert.equal(wordState('a', { picked: false, marks, showAnswer: false }), 'correct');
  assert.equal(wordState('b', { picked: true, marks, showAnswer: false }), 'incorrect');
  assert.equal(wordState('z', { picked: false, marks, showAnswer: false }), 'default');
  assert.equal(wordState('a', { picked: true, marks: null, showAnswer: false }), 'picked');
  assert.equal(wordState('a', { picked: false, marks: null, showAnswer: false }), 'default');
});

console.log(`textOrdering: ${passed} checks passed`);
