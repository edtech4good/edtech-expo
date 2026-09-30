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
  bottomRight,
  COMPACT_AUDIO_RESERVE,
  COMPACT_AUDIO_SIZE,
  compactCaptionShown,
  COMPACT_ORDERING_CHROME,
  COMPACT_ORDERING_MIN_IMAGE,
  markClearOfAudio,
  ORDERING_COMPACT_AUDIO,
  ORDERING_COMPACT_MARK,
  ORDERING_TILE_INSET,
  rectsOverlap,
  REGULAR_AUDIO_SIZE as OPTION_AUDIO_SIZE,
  TINY_TILE_BELOW,
  topRight,
} from '../compactTile';
import {
  COMPACT_CARD_AUDIO,
  COMPACT_MIN_TILE,
  compactCardMark,
} from '../../../screens/Practice/Corporate/imageChoice/imageChoiceLogic';

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
  assert.deepEqual(topRight(100, { size: 18, vertical: 4, right: 4 }), { x: 78, y: 4, width: 18, height: 18 });
  assert.deepEqual(bottomRight(100, 60, { size: 28, vertical: 0, right: 0 }), { x: 72, y: 32, width: 28, height: 28 });
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

check('ordering: from the compact floor (52) up, the audio circle never covers the mark, at any width', () => {
  for (let h = COMPACT_ORDERING_MIN_IMAGE; h <= 200; h++) {
    for (const w of [64, 80, 100, 150, 200]) {
      assert.ok(markClearOfAudio(w, h, ORDERING_COMPACT_MARK, ORDERING_COMPACT_AUDIO), `${w}x${h}`);
    }
  }
  // The floor sits just above the lowest height that works (51): two points
  // less and they meet.
  assert.equal(markClearOfAudio(100, COMPACT_ORDERING_MIN_IMAGE - 1, ORDERING_COMPACT_MARK, ORDERING_COMPACT_AUDIO), true);
  assert.equal(markClearOfAudio(100, COMPACT_ORDERING_MIN_IMAGE - 2, ORDERING_COMPACT_MARK, ORDERING_COMPACT_AUDIO), false);
  // And the regular 44 circle would have covered it at these sizes.
  const regular = { size: OPTION_AUDIO_SIZE, vertical: 7 - ORDERING_TILE_INSET, right: 7 - ORDERING_TILE_INSET };
  assert.equal(markClearOfAudio(100, 60, { size: 22, vertical: 6, right: 6 }, regular), false);
});

check('multiple choice: from the compact floor (56) up, the audio circle never covers the mark', () => {
  assert.equal(COMPACT_MIN_TILE, 56);
  for (let side = COMPACT_MIN_TILE; side <= 200; side++) {
    assert.ok(markClearOfAudio(side, side, compactCardMark(side), COMPACT_CARD_AUDIO), `side ${side}`);
  }
  // Tiny cards get the smaller mark; 64 and up the regular compact one.
  assert.equal(compactCardMark(56).size, 16);
  assert.equal(compactCardMark(63).size, 16);
  assert.equal(compactCardMark(64).size, 22);
  // The 44 circle the compact card had before would cover a 56 card's mark.
  assert.equal(markClearOfAudio(56, 56, compactCardMark(56), { size: OPTION_AUDIO_SIZE, vertical: 0, right: 0 }), false);
});

console.log(`compactTile: ${passed} checks passed`);
