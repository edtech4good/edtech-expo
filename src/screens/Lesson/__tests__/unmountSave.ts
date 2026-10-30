/**
 * The lesson's unmount save (edtech-expo#143): the same 5 s rules as before,
 * plus a duration guard so a failed reload (a NaN duration) never posts
 * `content_length: null` (the API answers 400 and the progress is lost).
 * Pure; run by `tsx` (package.json `test:fullscreen`).
 */
import assert from 'node:assert/strict';
import { planUnmountSave } from '../unmountSave';

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

check('under 5 s of progress saves nothing (as before)', () => {
  assert.equal(planUnmountSave({ positionMillis: 4999, durationMillis: 20000, lastGoodDuration: 20000 }), null);
});

check('mid-clip saves the position, not ended, with the stored duration (as before)', () => {
  assert.deepEqual(planUnmountSave({ positionMillis: 7000, durationMillis: 20000, lastGoodDuration: 20000 }), {
    progress: 7000, hasEnded: false, duration: 20000,
  });
});

check('within 5 s of the end counts as ended (as before)', () => {
  assert.equal(planUnmountSave({ positionMillis: 15001, durationMillis: 20000, lastGoodDuration: 20000 })?.hasEnded, true);
  assert.equal(planUnmountSave({ positionMillis: 15000, durationMillis: 20000, lastGoodDuration: 20000 })?.hasEnded, false);
});

check('a NaN stored duration falls back to the last good one, never null', () => {
  for (const bad of [NaN, undefined, null, 0, Infinity]) {
    const plan = planUnmountSave({ positionMillis: 7000, durationMillis: bad, lastGoodDuration: 19949 });
    assert.deepEqual(plan, { progress: 7000, hasEnded: false, duration: 19949 }, String(bad));
  }
});

check('no usable duration at all (the clip never loaded) saves nothing', () => {
  assert.equal(planUnmountSave({ positionMillis: 7000, durationMillis: NaN, lastGoodDuration: null }), null);
});

check('a NaN or missing position saves nothing', () => {
  assert.equal(planUnmountSave({ positionMillis: NaN, durationMillis: 20000, lastGoodDuration: 20000 }), null);
  assert.equal(planUnmountSave({ positionMillis: undefined, durationMillis: 20000, lastGoodDuration: 20000 }), null);
});

console.log(`${passed} checks passed`);
