/**
 * The result strip's words and footer actions (kit/resultLogic.ts): the
 * summary line for correct / partly right / wrong, the title, what a screen
 * reader is told, and which footer buttons each result drives. English
 * defaults here; a second pass with the real Khmer strings from km.json
 * checks the line is built from the locale, not hard-coded.
 *
 * Plain script run by `tsx` (package.json `test:kit`).
 */
import assert from 'node:assert/strict';
import { interpolate } from '../../drag/reorder';
import km from '../../../locales/km.json';
import { footerActions, resultAnnouncement, resultSummary, resultTitle } from '../resultLogic';

// 1. Summary lines.
assert.equal(resultSummary({ kind: 'correct', correctCount: 6, total: 6 }), 'All 6 are in the right place.');
assert.equal(resultSummary({ kind: 'incorrect', correctCount: 4, total: 6 }), '4 of 6 are in the right place.');
assert.equal(resultSummary({ kind: 'incorrect', correctCount: 0, total: 5 }), '0 of 5 are in the right place.');
assert.equal(resultSummary({ kind: 'correct' }), 'Your answer is right.');
assert.equal(resultSummary({ kind: 'correct', correctCount: 1, total: 1 }), 'Your answer is right.');
assert.equal(resultSummary({ kind: 'incorrect' }), 'That is not the right answer.');
assert.equal(resultSummary({ kind: 'incorrect', correctCount: 0, total: 1 }), 'That is not the right answer.');
// Out-of-range counts are clamped, never shown as "7 of 6".
assert.equal(resultSummary({ kind: 'incorrect', correctCount: 9, total: 6 }), '6 of 6 are in the right place.');
assert.equal(resultSummary({ kind: 'incorrect', correctCount: -2, total: 6 }), '0 of 6 are in the right place.');
console.log('ok  summary lines');

// 2. Titles.
assert.equal(resultTitle('correct'), 'Correct');
assert.equal(resultTitle('incorrect'), 'Not quite');
console.log('ok  titles');

// 3. Announcement: title, summary, and the read-back only when given.
assert.equal(
  resultAnnouncement({ kind: 'incorrect', correctCount: 4, total: 6 }),
  'Not quite. 4 of 6 are in the right place.',
);
assert.equal(
  resultAnnouncement({ kind: 'correct', correctCount: 6, total: 6, readBack: 'Write every sale in your book.' }),
  'Correct. All 6 are in the right place. Read back: Write every sale in your book.',
);
console.log('ok  announcement');

// 4. Footer actions.
assert.deepEqual(footerActions('correct').map(a => a.id), ['next']);
assert.deepEqual(footerActions('incorrect').map(a => a.id), ['showAnswer', 'tryAgain']);
assert.deepEqual(footerActions('incorrect', { canShowAnswer: false }).map(a => a.id), ['tryAgain']);
assert.deepEqual(footerActions('incorrect', { canRetry: false }).map(a => a.id), ['showAnswer']);
assert.equal(footerActions('incorrect').find(a => a.id === 'tryAgain')?.emphasis, 'primary');
// Labels reuse the words the footer has today.
assert.equal(footerActions('correct')[0].labelKey, 'screen.practice.correctButton');
console.log('ok  footer actions');

// 5. The same logic with the Khmer strings: the line comes from the locale.
const kmT = (key: string, options?: Record<string, unknown>) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], km);
  assert.equal(typeof v, 'string', `km.json is missing ${key}`);
  return interpolate(v as string, options);
};
const kmLine = resultSummary({ kind: 'incorrect', correctCount: 4, total: 6 }, kmT);
assert.match(kmLine, /4/);
assert.match(kmLine, /6/);
assert.match(kmLine, /[ក-៿]/, 'Khmer script in the Khmer line');
assert.notEqual(kmLine, resultSummary({ kind: 'incorrect', correctCount: 4, total: 6 }));
console.log('ok  Khmer line comes from km.json:', kmLine);

console.log('\nall result strip checks passed');
