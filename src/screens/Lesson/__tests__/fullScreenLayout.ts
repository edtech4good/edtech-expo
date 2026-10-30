/**
 * The full-screen layout rule (edtech-expo#143): video height = room the bar
 * leaves, never overlapping it, and a landscape phone gives the video at
 * least 75% of the height. Pure; run by `tsx` (package.json `test:fullscreen`).
 */
import assert from 'node:assert/strict';
import {
  BAR_HEIGHT_ESTIMATE,
  fullScreenVideoBox,
  isSingleRowBar,
} from '../fullScreenLayout';

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

check('landscape phone 862x359: video gets the height the bar leaves, at least 75%', () => {
  const box = fullScreenVideoBox({ width: 862, height: 359 }, 72);
  assert.deepEqual(box, { width: 862, height: 287 });
  assert.ok(box.height / 359 >= 0.75, `share ${box.height / 359}`);
});

check('the video and the bar never overlap, in either orientation, for many sizes', () => {
  for (const [w, h] of [[862, 359], [800, 360], [411, 838], [390, 844], [360, 640], [1280, 800], [300, 200]])
    for (const bar of [0, 60, 72, 80, 130, 400]) {
      const box = fullScreenVideoBox({ width: w, height: h }, bar);
      assert.ok(box.height >= 0);
      assert.ok(box.height + bar <= Math.max(h, bar), `${w}x${h} bar ${bar}: ${box.height}`);
      if (bar <= h) assert.ok(box.height + bar <= h, `${w}x${h} bar ${bar}: overlap`);
    }
});

check('portrait phone: full width at 16:9, above the bar', () => {
  assert.deepEqual(fullScreenVideoBox({ width: 411, height: 838 }, 130), { width: 411, height: 231 });
});

check('portrait with a bar taller than the 16:9 leftover shrinks the video, not the bar', () => {
  assert.equal(fullScreenVideoBox({ width: 411, height: 300 }, 130).height, 170);
});

check('single-row bar from 640 wide, two rows below', () => {
  assert.equal(isSingleRowBar(862), true);
  assert.equal(isSingleRowBar(640), true);
  assert.equal(isSingleRowBar(411), false);
});

check('the pre-measure estimate leaves a landscape phone at least 75%', () => {
  assert.ok(fullScreenVideoBox({ width: 862, height: 359 }, BAR_HEIGHT_ESTIMATE).height / 359 >= 0.75);
});

console.log(`${passed} checks passed`);
