interface LayoutTokens {
  divider: number;
  large: number;
}

/** Smallest tile we will shrink to; below this a picture stops being legible. */
export const MIN_TILE_SIZE = 96;

/**
 * Side of a picture tile: the width-breakpoint size, clamped to the height
 * the answer box actually has (`available`, measured with onLayout, less the
 * tile's own border and padding). Tall boxes keep the breakpoint size; a
 * short one (landscape phone, or a tall header / wrapped question / safe-area
 * inset eating the screen) gets a smaller tile, never below MIN_TILE_SIZE.
 *
 * The box is a flex child sized by the screen, not by the tile, so measuring
 * it and then sizing the tile cannot feed back on itself. There is
 * deliberately no minHeight on the box: on a screen that does not scroll, a
 * floor taller than the room left would push Submit off the window.
 */
export function imageTileSize({
  breakpointSize,
  available,
}: {
  breakpointSize: number;
  available: number;
}): number {
  return Math.min(breakpointSize, Math.max(MIN_TILE_SIZE, Math.floor(available)));
}

/** Choice box: its border and the tile's selection border (`divider` each side), plus `large` above and below. */
export function choiceTileReserve(layouts: LayoutTokens): number {
  return 4 * layouts.divider + 2 * layouts.large;
}

/** Ordering area: the tile's 5px frame, plus `large` of padding above and the same below. */
export function arrangeTileReserve(layouts: LayoutTokens): number {
  return 5 + 2 * layouts.large;
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
