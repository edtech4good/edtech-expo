// Compact picture tiles (a phone on its side): the numbers and rules the
// kit's compact picture tiles share. No react-native imports (tested in
// plain node: `yarn test:kit`).
//
// A compact picture tile has no caption row under the picture: the caption
// sits on the picture, and the tile's chrome is only its frame (border plus
// padding). On a tiny picture the caption is dropped altogether, and the
// option audio circle is the small one, placed so it never covers the
// result mark.

/** Below this picture height (points) a compact tile is "tiny": no caption on it. */
export const TINY_TILE_BELOW = 64;

/** The option audio circle: regular (OptionAudioCircle's OPTION_AUDIO_SIZE), and compact. */
export const REGULAR_AUDIO_SIZE = 44;
export const COMPACT_AUDIO_SIZE = 28;

/** A box relative to the picture's top-left corner. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Whether a compact picture of this height shows its caption on the picture. */
export function compactCaptionShown(pictureHeight: number): boolean {
  return pictureHeight >= TINY_TILE_BELOW;
}

/** Whether two boxes share any area (touching edges do not count). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** Where a corner item sits on a picture, as insets from its edges. */
export interface CornerSpot {
  size: number;
  /** Inset from the picture's top (top corners) or bottom (bottom corners). */
  vertical: number;
  /** Inset from the picture's right edge. Negative reaches past it. */
  right: number;
}

/** The box a top-right corner item takes on a `width` x `height` picture. */
export function topRight(width: number, spot: CornerSpot): Rect {
  return { x: width - spot.right - spot.size, y: spot.vertical, width: spot.size, height: spot.size };
}

/** The box a bottom-right corner item takes on a `width` x `height` picture. */
export function bottomRight(width: number, height: number, spot: CornerSpot): Rect {
  return {
    x: width - spot.right - spot.size,
    y: height - spot.vertical - spot.size,
    width: spot.size,
    height: spot.size,
  };
}

/**
 * Whether the audio circle leaves the result mark uncovered on a picture of
 * this size: both sit in the right-hand corners, so it comes down to the
 * picture's height.
 */
export function markClearOfAudio(
  width: number,
  height: number,
  mark: CornerSpot,
  audio: CornerSpot,
): boolean {
  return !rectsOverlap(topRight(width, mark), bottomRight(width, height, audio));
}

// ---- Picture ordering (MovableTile's compact image variant in ReorderableList).

/**
 * Border plus padding of a grid tile's frame, each side, at its largest:
 * ReorderableList draws 1.5 + 7 (picked 2 + 6.5), and a result tint
 * (tileFrameStyle) makes the border 2 with the 7 padding above and below,
 * so 9 after Submit. The compact tile's whole chrome is twice this: 18.
 * The result mark only shows then, so the mark and audio maths use it too.
 */
export const ORDERING_TILE_INSET = 9;
export const COMPACT_ORDERING_CHROME = ORDERING_TILE_INSET * 2;

/** The result mark on a compact ordering picture. */
export const ORDERING_COMPACT_MARK: CornerSpot = { size: 18, vertical: 4, right: 4 };
/**
 * The audio circle on a compact ordering tile. It is positioned in the list
 * item (the tile's outer edge), 10 from its right and bottom, which is 1
 * inside the picture's corner after Submit.
 */
export const ORDERING_COMPACT_AUDIO_OFFSET = 10;
export const ORDERING_COMPACT_AUDIO: CornerSpot = {
  size: COMPACT_AUDIO_SIZE,
  vertical: ORDERING_COMPACT_AUDIO_OFFSET - ORDERING_TILE_INSET,
  right: ORDERING_COMPACT_AUDIO_OFFSET - ORDERING_TILE_INSET,
};

/**
 * The smallest compact ordering picture: just above the lowest height at
 * which the audio circle clears the mark (51, see the tests), so the mark
 * is never covered.
 */
export const COMPACT_ORDERING_MIN_IMAGE = 52;

/** Room the caption on a compact picture leaves for the audio circle. */
export const COMPACT_AUDIO_RESERVE = COMPACT_AUDIO_SIZE + 4;
