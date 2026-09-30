// Corporate picture ordering: how big the pictures are. No react-native
// imports (tested in plain node).
//
// The approved design is 2 across on a phone (picture 104 high) and 4 across
// from 600pt (picture 128 high). The shell measures the room the body has
// (`layout.availableHeight`, from below the question card to the top of the
// footer, and less once the result strip is showing), so this only makes the
// pictures as large as that room allows, and refits when it changes: every
// row is in view after Submit whenever it can be. It is the same idea as
// expo#109's imageTileSize, clamped to a measured height and never a hard
// minHeight. Where even the floor does not fit (a phone on its side) the
// shell's ScrollView scrolls: nothing is cut off.
import { gridColumns, gridItemWidth } from '../../../../components/drag/reorder';

/**
 * Smallest picture height, regular and compact alike. 64 is what the shell's
 * contract allows a compact tile; a regular phone needs it too when Khmer's
 * taller lines and the tab bar leave three rows of six pictures little room.
 */
export const MIN_IMAGE_HEIGHT = 64;
/** Design heights: phone (2 across) and desktop (4 across). */
export const PHONE_IMAGE_HEIGHT = 104;
export const DESKTOP_IMAGE_HEIGHT = 128;
/** A tile beyond its picture: 7 + 7 padding, 6 gap and the 44 caption / audio row. */
export const TILE_CHROME = 64;

export interface ImageOrderingLayout {
  columns: number;
  gap: number;
  tileWidth: number;
  imageHeight: number;
}

export function imageOrderingLayout({
  availableWidth,
  availableHeight,
  gridTop,
  count,
  compact,
}: {
  /** The shell's `layout.availableWidth`. */
  availableWidth: number;
  /** The shell's `layout.availableHeight`. */
  availableHeight: number;
  /** Where the grid starts inside the body (the instruction line above it). */
  gridTop: number;
  count: number;
  compact: boolean;
}): ImageOrderingLayout {
  const columns = gridColumns(availableWidth);
  const gap = compact ? 10 : columns === 4 ? 16 : 12;
  const tileWidth = gridItemWidth(availableWidth, columns, gap);
  const preferred = columns === 4 ? DESKTOP_IMAGE_HEIGHT : PHONE_IMAGE_HEIGHT;
  const room = availableHeight - gridTop;
  if (!(room > 0) || count <= 0) return { columns, gap, tileWidth, imageHeight: preferred };
  const rows = Math.ceil(count / columns);
  const perRow = (room - gap * (rows - 1)) / rows;
  const fit = Math.floor(perRow - TILE_CHROME);
  return { columns, gap, tileWidth, imageHeight: Math.min(preferred, Math.max(MIN_IMAGE_HEIGHT, fit)) };
}
