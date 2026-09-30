// Corporate picture ordering: how big the pictures are. No react-native
// imports (tested in plain node).
//
// The approved design is 2 across on a phone (picture 104 high) and 4 across
// from 600pt (picture 128 high). The shell scrolls its content above a pinned
// footer, so tiles can never sit behind Submit; this only makes the pictures
// as large as the window allows, so on a short window (a landscape phone) as
// many rows as possible are visible without scrolling. It is the same idea as
// expo#109's imageTileSize: clamp the preferred size to a MEASURED height
// (where the grid starts, from the window), never a hard minHeight.
import { gridColumns, gridItemWidth } from '../../../../components/drag/reorder';

/** Smallest picture height; below this a photo stops being legible. */
export const MIN_IMAGE_HEIGHT = 72;
/** Design heights: phone (2 across) and desktop (4 across). */
export const PHONE_IMAGE_HEIGHT = 104;
export const DESKTOP_IMAGE_HEIGHT = 128;
/** A tile beyond its picture: 7 + 7 padding, 6 gap and the 44 caption / audio row. */
export const TILE_CHROME = 64;
/** The pinned footer: 16 + 52 (Submit) + 16 padding, and its 1px rule. */
export const FOOTER_HEIGHT = 85;

export interface ImageOrderingLayout {
  columns: number;
  gap: number;
  /** Tile width, or 0 until the grid's width is measured. */
  tileWidth: number;
  imageHeight: number;
}

export function imageOrderingLayout({
  containerWidth,
  windowHeight,
  gridTop,
  tabBarHeight = 0,
  count,
}: {
  /** Width of the grid, from onLayout (0 before it is measured). */
  containerWidth: number;
  windowHeight: number;
  /** The grid's top edge in the window, measured (null before it is). */
  gridTop: number | null;
  /** The bottom tab bar (phones), which sits under the pinned footer. */
  tabBarHeight?: number;
  count: number;
}): ImageOrderingLayout {
  const columns = gridColumns(containerWidth);
  const gap = columns === 4 ? 16 : 12;
  const tileWidth = gridItemWidth(containerWidth, columns, gap);
  const preferred = columns === 4 ? DESKTOP_IMAGE_HEIGHT : PHONE_IMAGE_HEIGHT;
  if (gridTop === null || windowHeight <= 0 || count <= 0) {
    return { columns, gap, tileWidth, imageHeight: preferred };
  }
  const rows = Math.ceil(count / columns);
  const available = windowHeight - gridTop - FOOTER_HEIGHT - tabBarHeight;
  const perRow = (available - gap * (rows - 1)) / rows;
  const fit = Math.floor(perRow - TILE_CHROME);
  return {
    columns,
    gap,
    tileWidth,
    imageHeight: Math.min(preferred, Math.max(MIN_IMAGE_HEIGHT, fit)),
  };
}
