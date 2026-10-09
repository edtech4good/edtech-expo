/**
 * Band to clip to file for the result screen: pass plays pass; close and far
 * both play try-again. Plain script run by `tsx` (package.json `test:result`).
 */
import assert from 'node:assert/strict';
import { mascotFile } from '../../../components/mascot/mascotLogic';
import { clipForBand } from '../mascotClip';

assert.equal(clipForBand('passed'), 'pass');
assert.equal(clipForBand('close'), 'try-again');
assert.equal(clipForBand('far'), 'try-again');
assert.equal(mascotFile('bear', clipForBand('passed')), 'bear-pass.json');
assert.equal(mascotFile('rabbit', clipForBand('close')), 'rabbit-try-again.json');
assert.equal(mascotFile('rabbit', clipForBand('far')), 'rabbit-try-again.json');
console.log('ok  band to file');
