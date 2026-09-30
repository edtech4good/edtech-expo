/**
 * Layout rules for the picture-choice answer area (PracticeMCQImage), kept
 * free of React Native imports so a plain-node test can assert them.
 */

interface LayoutTokens {
  divider: number;
  large: number;
}

/**
 * Smallest height the white answer box may shrink to: one tile, the
 * selection border MCQImageItem draws round it (`divider` px each side) and
 * `large` px of room above and below. On a short screen (landscape phone)
 * the box is a flex:1 child of a column with a fixed header and footer, so
 * without this floor it shrinks below the tile height and the tiles spill
 * out of it. imageTileSize keeps the tile small enough that the floor fits.
 */
export function answerAreaMinHeight(
  tileSize: number,
  layouts: LayoutTokens,
): number {
  return tileSize + 2 * layouts.divider + 2 * layouts.large;
}

/**
 * Content style of the horizontal tile row. `flexGrow: 1` fills the box and
 * centres the tiles while they fit, and lets the row grow wider than the
 * box when they do not, so it scrolls from the first tile. `flex: 1` pins
 * the row to the box width: centring then pushes the overflow off the left
 * edge, where it cannot be scrolled to.
 */
export function tileRowContentStyle(layouts: LayoutTokens) {
  return {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layouts.large,
  } as const;
}

/**
 * Height the question screen spends on everything except the answer box:
 * app bar, progress track, question card, the two gaps and the Submit
 * footer (measured ~235dp in a real-browser run of the corporate quiz, plus
 * a little slack for a two-line question). Used only to decide how tall a
 * picture tile may be on a short screen.
 */
export const QUESTION_CHROME_HEIGHT = 240;

/** Smallest tile we will shrink to; below this a picture stops being legible. */
export const MIN_TILE_SIZE = 96;

/**
 * Side of a picture tile: the width-breakpoint size, clamped so the answer
 * box (tile + `reserve` dp of border and padding) still fits between the
 * question chrome and the bottom of the window. Tall screens keep the
 * breakpoint size unchanged; a landscape phone (375dp tall) gets a smaller
 * tile so the question and Submit stay on screen without scrolling.
 */
export function imageTileSize({
  breakpointSize,
  height,
  reserve,
}: {
  breakpointSize: number;
  height: number;
  reserve: number;
}): number {
  const fits = height - QUESTION_CHROME_HEIGHT - reserve;
  return Math.min(breakpointSize, Math.max(MIN_TILE_SIZE, Math.floor(fits)));
}
