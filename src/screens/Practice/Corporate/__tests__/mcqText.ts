/**
 * Corporate multiple choice, text: the result is part of an option's name
 * for a screen reader after Submit, in the picture choice's wording.
 *
 * Plain script run by `tsx` (package.json `test:shell`).
 */
import assert from 'node:assert/strict';
import { mcqResultLabelKey } from '../mcqTextLogic';
import en from '../../../../locales/en.json';
import km from '../../../../locales/km.json';

assert.equal(mcqResultLabelKey('default', false), null, 'no result while answering');
assert.equal(mcqResultLabelKey('selected', false), null, 'a selection is not a result');
assert.equal(mcqResultLabelKey('correct', false), 'corporate.mcqImage.correct');
assert.equal(mcqResultLabelKey('incorrect', false), 'corporate.mcqImage.incorrect');
assert.equal(mcqResultLabelKey('correct', true), 'corporate.mcqImage.correctAnswer', 'Show answer');
assert.equal(mcqResultLabelKey('default', true), null, 'unchosen options stay unmarked');
for (const key of ['correct', 'incorrect', 'correctAnswer'] as const) {
  for (const [name, loc] of [['en', en], ['km', km]] as const) {
    const v = (loc as any).corporate.mcqImage[key] as string;
    assert.ok(v.includes('{{label}}'), `${name} ${key} names the option`);
  }
}
console.log('ok  mcq text result labels');
