/**
 * Compact picture tiles (kit/compactTile.ts): the tiny-tile caption rule and
 * the audio circle never covering the result mark, for picture ordering
 * (MovableTile's compact image variant) and picture multiple choice
 * (ImageChoiceCard's compact card).
 *
 * Plain script run by `tsx` (package.json `test:kit`).
 */
import assert from 'node:assert/strict';
import {
  COMPACT_AUDIO_RESERVE,
  COMPACT_AUDIO_SIZE,
  compactCaptionShown,
  COMPACT_ORDERING_CHROME,
  COMPACT_ORDERING_MIN_IMAGE,
  mcqCompactRects,
  MIN_TOUCH,
  orderingCompactRects,
  orderingGripShown,
  orderingMarkCorner,
  ORDERING_TILE_INSET,
  rectInside,
  rectsOverlap,
  REGULAR_AUDIO_SIZE as OPTION_AUDIO_SIZE,
  TINY_TILE_BELOW,
  type Rect,
} from '../compactTile';
import { COMPACT_MIN_TILE } from '../../../screens/Practice/Corporate/imageChoice/imageChoiceLogic';
import { COMPACT_MIN_TILE_WIDTH } from '../../../screens/Practice/Corporate/ImageOrdering/imageOrderingLayout';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check('rects: overlap needs shared area; touching edges do not count', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  assert.equal(rectsOverlap(a, { x: 5, y: 5, width: 10, height: 10 }), true);
  assert.equal(rectsOverlap(a, { x: 10, y: 0, width: 10, height: 10 }), false);
  assert.equal(rectsOverlap(a, { x: 0, y: 10, width: 10, height: 10 }), false);
  assert.equal(rectInside({ x: 2, y: 2, width: 5, height: 5 }, a), true);
  assert.equal(rectInside({ x: 6, y: 2, width: 5, height: 5 }, a), false);
});

check('tiny tiles: a picture under 64 drops its caption; 64 and up keep it', () => {
  assert.equal(TINY_TILE_BELOW, 64);
  assert.equal(compactCaptionShown(63), false);
  assert.equal(compactCaptionShown(52), false);
  assert.equal(compactCaptionShown(64), true);
  assert.equal(compactCaptionShown(128), true);
});

check('the compact audio circle is 28 and the caption leaves it room', () => {
  assert.equal(COMPACT_AUDIO_SIZE, 28);
  assert.ok(COMPACT_AUDIO_SIZE < OPTION_AUDIO_SIZE);
  assert.equal(COMPACT_AUDIO_RESERVE, 32);
});

check('ordering: the compact tile chrome is the frame only (18)', () => {
  assert.equal(ORDERING_TILE_INSET, 9);
  assert.equal(COMPACT_ORDERING_CHROME, 18);
});

const clear = (a: Rect | null, b: Rect | null) => !a || !b || !rectsOverlap(a, b);

check('audio targets are 44 x 44 and hold the 28pt disc, on both picture types', () => {
  assert.equal(MIN_TOUCH, 44);
  for (const after of [false, true]) {
    const o = orderingCompactRects(80, 52, after);
    assert.deepEqual([o.audioTarget.width, o.audioTarget.height], [44, 44]);
    assert.deepEqual([o.audioDisc.width, o.audioDisc.height], [28, 28]);
    assert.ok(rectInside(o.audioDisc, o.audioTarget));
  }
  const m = mcqCompactRects(60);
  assert.deepEqual([m.audioTarget.width, m.audioTarget.height], [44, 44]);
  assert.ok(rectInside(m.audioDisc, m.audioTarget));
});

check('ordering: tiny pictures drop the grip and move the mark bottom-left; 64 and up keep both top-right', () => {
  assert.equal(orderingGripShown(63), false);
  assert.equal(orderingGripShown(64), true);
  assert.equal(orderingMarkCorner(63), 'bottom-left');
  assert.equal(orderingMarkCorner(64), 'top-right');
});

check('ordering: from the floor (52) up, at every tile width, the audio target clears the grip, the mark and the badge', () => {
  // The narrowest compact tile is 88 (COMPACT_MIN_TILE_WIDTH), so its picture is 88 - 18 = 70.
  const minWidth = COMPACT_MIN_TILE_WIDTH - COMPACT_ORDERING_CHROME;
  for (let h = COMPACT_ORDERING_MIN_IMAGE; h <= 200; h++) {
    for (let w = minWidth; w <= 220; w += 3) {
      for (const after of [false, true]) {
        const r = orderingCompactRects(w, h, after);
        const at = `${w}x${h} ${after ? 'after' : 'before'} Submit`;
        assert.ok(clear(r.audioTarget, r.grip), `grip ${at}`);
        assert.ok(clear(r.audioTarget, r.mark), `mark ${at}`);
        assert.ok(clear(r.audioTarget, r.badge), `badge ${at}`);
        assert.ok(clear(r.mark, r.badge), `mark/badge ${at}`);
        assert.ok(clear(r.grip, r.badge), `grip/badge ${at}`);
      }
    }
  }
});

check('ordering: without the tiny rules, the target would meet the grip and the mark at the floor', () => {
  // What the review found: a 26pt grip top-right and the audio bottom-right meet on a 52 picture.
  const h = COMPACT_ORDERING_MIN_IMAGE;
  const target = orderingCompactRects(80, h, false).audioTarget;
  assert.ok(rectsOverlap(target, { x: 80 - 26, y: 0, width: 26, height: 26 }), 'a grip there would be covered');
  const after = orderingCompactRects(80, h, true).audioTarget;
  assert.ok(rectsOverlap(after, { x: 80 - 4 - 18, y: 4, width: 18, height: 18 }), 'a top-right mark there would be covered');
  assert.equal(ORDERING_TILE_INSET, 9);
});

check('multiple choice: from the floor (60) up, the audio target clears the mark and the control', () => {
  assert.equal(COMPACT_MIN_TILE, 60);
  for (let side = COMPACT_MIN_TILE; side <= 200; side++) {
    const r = mcqCompactRects(side);
    assert.ok(clear(r.audioTarget, r.mark), `mark ${side}`);
    assert.ok(clear(r.audioTarget, r.control), `control ${side}`);
    assert.ok(clear(r.mark, r.control), `mark/control ${side}`);
  }
  // Tiny cards get the smaller mark and control; 64 and up the compact 18 / 20.
  assert.equal(mcqCompactRects(63).mark.width, 16);
  assert.equal(mcqCompactRects(63).control.width, 14);
  assert.equal(mcqCompactRects(64).mark.width, 18);
  assert.equal(mcqCompactRects(64).control.width, 20);
  // Below the floor the target would meet the mark: the floor is binding.
  assert.ok(rectsOverlap(mcqCompactRects(56).audioTarget, mcqCompactRects(56).mark));
});

console.log(`compactTile: ${passed} checks passed`);
