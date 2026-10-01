/**
 * DragToTarget's pure logic (src/components/drag/dropTarget.ts): which drop
 * target is under the pointer, the pointer in the stage's frame, and when a
 * press that follows a drag is ignored.
 *
 * Plain script run by `tsx` (package.json `test:drag`). Exits non-zero on
 * the first failed check. The gesture itself was checked on Expo web (mouse
 * and touch) and the Android emulator; see the PR.
 */
import assert from 'node:assert/strict';
import {
  distanceToRect,
  hitTarget,
  pointerInStage,
  pointInRect,
  PRESS_AFTER_DRAG_MS,
  pressBlocked,
  TARGET_SLOP,
} from '../dropTarget';

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

const r = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

// Three matching rows and a bank below them, in the stage's frame.
const ROWS = {
  'slot:a': r(0, 0, 300, 60),
  'slot:b': r(0, 66, 300, 60),
  'slot:c': r(0, 132, 300, 60),
  bank: r(0, 220, 300, 120),
};

check('the default slop is TARGET_SLOP (repeated as a literal for the worklet)', () => {
  const t = { a: r(0, 0, 10, 10) };
  assert.equal(hitTarget({ x: 10 + TARGET_SLOP, y: 5 }, t), 'a');
  assert.equal(hitTarget({ x: 10 + TARGET_SLOP + 0.5, y: 5 }, t), '');
});

check('a point is in a rect including its edges, and not outside', () => {
  assert.equal(pointInRect({ x: 0, y: 0 }, r(0, 0, 10, 10)), true);
  assert.equal(pointInRect({ x: 10, y: 10 }, r(0, 0, 10, 10)), true);
  assert.equal(pointInRect({ x: 10.5, y: 5 }, r(0, 0, 10, 10)), false);
  assert.equal(pointInRect({ x: 5, y: -0.5 }, r(0, 0, 10, 10)), false);
});

check('distance to a rect is 0 inside and straight-line outside', () => {
  assert.equal(distanceToRect({ x: 5, y: 5 }, r(0, 0, 10, 10)), 0);
  assert.equal(distanceToRect({ x: 13, y: 5 }, r(0, 0, 10, 10)), 3);
  assert.equal(distanceToRect({ x: 13, y: 14 }, r(0, 0, 10, 10)), 5);
});

check('the target under the pointer is the one that contains it', () => {
  assert.equal(hitTarget({ x: 150, y: 30 }, ROWS), 'slot:a');
  assert.equal(hitTarget({ x: 10, y: 100 }, ROWS), 'slot:b');
  assert.equal(hitTarget({ x: 299, y: 191 }, ROWS), 'slot:c');
  assert.equal(hitTarget({ x: 150, y: 300 }, ROWS), 'bank');
});

check('nothing under the pointer, and nothing within the slop, is no target', () => {
  assert.equal(hitTarget({ x: 150, y: 206 }, ROWS), '', '14pt from both slot c and the bank');
  assert.equal(hitTarget({ x: 150, y: 220 - TARGET_SLOP - 1 }, { bank: ROWS.bank }), '');
  assert.equal(hitTarget({ x: 600, y: 30 }, ROWS), '');
  assert.equal(hitTarget({ x: 5, y: 5 }, {}), '');
});

check('just outside a small target, within the slop, still lands on it (the nearest one)', () => {
  const blanks = { 'blank:0': r(40, 10, 96, 44), 'blank:1': r(200, 10, 96, 44) };
  assert.equal(hitTarget({ x: 140, y: 30 }, blanks), 'blank:0', '4pt right of blank 0');
  assert.equal(hitTarget({ x: 190, y: 30 }, blanks), 'blank:1', '10pt left of blank 1');
  assert.equal(hitTarget({ x: 168, y: 30 }, blanks), '', 'halfway, 32pt from both');
  // In the gap between rows (6pt), the nearer row wins.
  assert.equal(hitTarget({ x: 150, y: 61 }, ROWS), 'slot:a');
  assert.equal(hitTarget({ x: 150, y: 65 }, ROWS), 'slot:b');
  assert.equal(hitTarget({ x: 150, y: 200 }, ROWS, 0), '', 'no slop: no target');
});

check('inside nested targets, the smallest wins (a slot over the area it sits in)', () => {
  const nested = { area: r(0, 0, 400, 400), 'slot:x': r(100, 100, 50, 50) };
  assert.equal(hitTarget({ x: 120, y: 120 }, nested), 'slot:x');
  assert.equal(hitTarget({ x: 10, y: 10 }, nested), 'area');
  // Containment beats a nearer neighbour within the slop.
  assert.equal(hitTarget({ x: 95, y: 120 }, nested), 'area');
});

check('a rect that was never measured (no size) is never hit', () => {
  assert.equal(hitTarget({ x: 0, y: 0 }, { a: r(0, 0, 0, 0) }), '');
  assert.equal(hitTarget({ x: 1, y: 1 }, { a: r(0, 0, 0, 0), b: r(0, 0, 10, 10) }), 'b');
});

check('the pointer in the stage: its screen position less the stage\'s, plus any scroll since', () => {
  assert.deepEqual(pointerInStage({ x: 45, y: 300 }, { x: 16, y: 120 }), { x: 29, y: 180 });
  // The page scrolled 40 down under a still pointer: the pointer is 40 further down the stage.
  assert.deepEqual(pointerInStage({ x: 45, y: 300 }, { x: 16, y: 120 }, { x: 0, y: 40 }), { x: 29, y: 220 });
  // A finger over the second row's slot, with the stage 200pt down the screen, lands on it.
  assert.equal(hitTarget(pointerInStage({ x: 250, y: 296 }, { x: 16, y: 200 }), ROWS), 'slot:b');
});

check('a press is ignored during a drag and just after it, and not later', () => {
  assert.equal(pressBlocked(true, 0, 10_000), true);
  assert.equal(pressBlocked(false, 1000, 1000 + PRESS_AFTER_DRAG_MS - 1), true);
  assert.equal(pressBlocked(false, 1000, 1000 + PRESS_AFTER_DRAG_MS), false);
  assert.equal(pressBlocked(false, 0, 10_000), false);
});

console.log(`\ndropTarget: ${passed} checks passed`);
