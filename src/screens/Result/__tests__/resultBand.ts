/**
 * Band selection for the corporate result screen: boundaries at the pass
 * mark (80) and at the bottom of the "close" range (60). The hasPassed input
 * is derived exactly as useResult derives it (`percentage >= PASS_PERCENTAGE`).
 *
 * Plain script run by `tsx` (package.json `test:result`).
 */
import assert from 'node:assert/strict';
import { PASS_PERCENTAGE } from '../../../constants/progress';
import { CLOSE_MARGIN, resultBand } from '../resultBand';

const band = (pct: number) => resultBand(pct >= PASS_PERCENTAGE, pct);

assert.equal(PASS_PERCENTAGE, 80, 'pass mark is the app-wide 80');
assert.equal(CLOSE_MARGIN, 20);

// Passed: at the mark and above.
assert.equal(band(100), 'passed');
assert.equal(band(87.5), 'passed'); // 7 of 8
assert.equal(band(80), 'passed'); // exactly the mark

// Close: under the mark, within 20 points.
assert.equal(band(79.99), 'close');
assert.equal(band(75), 'close'); // 6 of 8
assert.equal(band(62.5), 'close'); // 5 of 8, the UAT screenshot
assert.equal(band(60), 'close'); // bottom of the range, inclusive

// Far: further off.
assert.equal(band(59.99), 'far');
assert.equal(band(50), 'far'); // 4 of 8
assert.equal(band(0), 'far');

// The verdict is read, not recomputed: a pass is a pass whatever the number.
assert.equal(resultBand(true, 10), 'passed');
// An empty quiz (percentage 0, not passed) is "far", never a crash.
assert.equal(resultBand(false, 0), 'far');

// A different pass mark moves both boundaries with it (90: close from 70).
assert.equal(resultBand(false, 70, 90), 'close');
assert.equal(resultBand(false, 69.9, 90), 'far');
assert.equal(resultBand(false, 69.9, 90, 30), 'close');

console.log('ok  result bands');
