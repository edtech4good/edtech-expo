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

/** The smallest touch target on every platform (points), whatever is drawn. */
export const MIN_TOUCH = 44;

/** A box of `size` whose bottom-right corner is at (right, bottom), picture-relative. */
function boxEndingAt(right: number, bottom: number, size: number): Rect {
  return { x: right - size, y: bottom - size, width: size, height: size };
}
function boxAt(x: number, y: number, size: number): Rect {
  return { x, y, width: size, height: size };
}

/** Whether `inner` lies wholly inside `outer`. */
export function rectInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

// ---- Picture ordering (MovableTile's compact image variant in ReorderableList).

/**
 * Border plus padding of a grid tile's frame, each side: 1.5 + 7 while
 * answering (picked 2 + 6.5), and after Submit a result tint
 * (tileFrameStyle) makes the border 2 with the 7 padding above and below,
 * so 9. The compact tile's whole chrome is twice the larger: 18.
 */
export const ORDERING_TILE_INSET = 9;
export const ORDERING_TILE_INSET_ANSWERING = 8.5;
export const COMPACT_ORDERING_CHROME = ORDERING_TILE_INSET * 2;

/**
 * The option audio control on a compact ordering tile: a 44 x 44 touch
 * target in the list item's bottom-right corner (inside the item, so it is
 * touchable on native too), with the 28pt disc drawn 10 from the item's
 * right and bottom, about 1 inside the picture's corner.
 */
export const ORDERING_COMPACT_AUDIO_DISC_OFFSET = 10;

/** The position badge (top-left) and the grip (top-right) on a compact picture. */
export const ORDERING_COMPACT_BADGE = { size: 24, inset: 4 };
export const ORDERING_COMPACT_GRIP = { size: 26, inset: 0 };
/** The result mark: top-right, or bottom-left on a tiny picture (see below). */
export const ORDERING_COMPACT_MARK = { size: 18, inset: 4 };

/**
 * The grip shows only on a picture tall enough for it to clear the audio
 * target. On a tiny picture it is dropped: the whole tile is the drag
 * handle, and the list's own label says it can be moved.
 */
export function orderingGripShown(pictureHeight: number): boolean {
  return pictureHeight >= TINY_TILE_BELOW;
}

/**
 * Where the result mark sits: top-right, except on a tiny picture, where
 * the audio target reaches the top-right corner; there it is bottom-left
 * (a tiny picture has no caption band there).
 */
export function orderingMarkCorner(pictureHeight: number): 'top-right' | 'bottom-left' {
  return pictureHeight >= TINY_TILE_BELOW ? 'top-right' : 'bottom-left';
}

export interface OrderingCompactRects {
  audioTarget: Rect;
  audioDisc: Rect;
  badge: Rect;
  grip: Rect | null;
  mark: Rect | null;
}

/**
 * The boxes on a compact ordering picture (`width` x `height`), relative to
 * its top-left corner. Answering: the grip, no mark. After Submit: the mark,
 * no grip.
 */
export function orderingCompactRects(
  width: number,
  height: number,
  afterSubmit: boolean,
): OrderingCompactRects {
  const inset = afterSubmit ? ORDERING_TILE_INSET : ORDERING_TILE_INSET_ANSWERING;
  const itemRight = width + inset;
  const itemBottom = height + inset;
  const b = ORDERING_COMPACT_BADGE;
  const g = ORDERING_COMPACT_GRIP;
  const m = ORDERING_COMPACT_MARK;
  const markCorner = orderingMarkCorner(height);
  return {
    audioTarget: boxEndingAt(itemRight, itemBottom, MIN_TOUCH),
    audioDisc: boxEndingAt(
      itemRight - ORDERING_COMPACT_AUDIO_DISC_OFFSET,
      itemBottom - ORDERING_COMPACT_AUDIO_DISC_OFFSET,
      COMPACT_AUDIO_SIZE,
    ),
    badge: boxAt(b.inset, b.inset, b.size),
    grip: !afterSubmit && orderingGripShown(height) ? boxAt(width - g.inset - g.size, g.inset, g.size) : null,
    mark: !afterSubmit
      ? null
      : markCorner === 'top-right'
        ? boxAt(width - m.inset - m.size, m.inset, m.size)
        : boxAt(m.inset, height - m.inset - m.size, m.size),
  };
}

/**
 * The smallest compact ordering picture. Chosen so a six-picture Khmer
 * question with audio still fits a phone on its side after Submit; the
 * tiny-tile rules above keep the audio target clear of everything at this
 * size (see the tests).
 */
export const COMPACT_ORDERING_MIN_IMAGE = 52;

/** Room the caption on a compact picture leaves for the audio circle. */
export const COMPACT_AUDIO_RESERVE = COMPACT_AUDIO_SIZE + 4;

// ---- Picture multiple choice (ImageChoiceCard's compact card).

/** The compact card's border plus padding, each side (1 + 3, or 2 + 2 chosen). */
export const MCQ_COMPACT_FRAME = 4;

/** The result mark (top-right) and the radio or checkbox (top-left). */
export function mcqCompactMarkSize(side: number): number {
  return side < TINY_TILE_BELOW ? 16 : 18;
}
export function mcqCompactControlSize(side: number): number {
  return side < TINY_TILE_BELOW ? 14 : 20;
}
export const MCQ_COMPACT_CORNER_INSET = 3;

export interface McqCompactRects {
  audioTarget: Rect;
  audioDisc: Rect;
  mark: Rect;
  control: Rect;
}

/**
 * The boxes on a compact card's square picture (`side`), relative to its
 * top-left corner. The 44 x 44 audio target sits in the card's
 * bottom-right corner (inside the card), with the 28pt disc flush in the
 * picture's corner.
 */
export function mcqCompactRects(side: number): McqCompactRects {
  const i = MCQ_COMPACT_CORNER_INSET;
  const mark = mcqCompactMarkSize(side);
  return {
    audioTarget: boxEndingAt(side + MCQ_COMPACT_FRAME, side + MCQ_COMPACT_FRAME, MIN_TOUCH),
    audioDisc: boxEndingAt(side, side, COMPACT_AUDIO_SIZE),
    mark: boxAt(side - i - mark, i, mark),
    control: boxAt(i, i, mcqCompactControlSize(side)),
  };
}
