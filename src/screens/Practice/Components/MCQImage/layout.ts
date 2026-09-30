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
 * out of it. The screen scrolls instead (LayoutScrollView useScroll).
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
