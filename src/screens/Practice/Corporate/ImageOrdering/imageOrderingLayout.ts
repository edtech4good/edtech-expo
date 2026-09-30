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
// minHeight. Where even the floor does not fit the shell's ScrollView
// scrolls: nothing is cut off.
//
// Compact (a phone on its side): the caption sits on the picture, so a tile
// is its picture plus the frame (COMPACT_ORDERING_CHROME, 18), and the
// pictures go in one row whenever they are at least COMPACT_MIN_TILE_WIDTH
// wide that way (six pictures are 6 across at 812 x 375), since a second row
// costs a whole picture's height on a short screen.
import { gridColumns, gridItemWidth } from '../../../../components/drag/reorder';
import {
  COMPACT_ORDERING_CHROME,
  COMPACT_ORDERING_MIN_IMAGE,
} from '../../../../components/kit/compactTile';

/**
 * Smallest picture height in the regular layout. A regular phone needs it
 * when Khmer's taller lines and the tab bar leave three rows of six pictures
 * little room. (Compact has its own floor, COMPACT_MIN_IMAGE_HEIGHT.)
 */
export const MIN_IMAGE_HEIGHT = 64;
/** Design heights: phone (2 across) and desktop (4 across). */
export const PHONE_IMAGE_HEIGHT = 104;
export const DESKTOP_IMAGE_HEIGHT = 128;
/** A tile beyond its picture: 7 + 7 padding, 6 gap and the 44 caption / audio row. */
export const TILE_CHROME = 64;
/** Compact: a tile beyond its picture is only its frame (the caption is on the picture). */
export const COMPACT_TILE_CHROME = COMPACT_ORDERING_CHROME;
/** Compact: the smallest picture (the audio circle still clears the mark). */
export const COMPACT_MIN_IMAGE_HEIGHT = COMPACT_ORDERING_MIN_IMAGE;
/** Compact: the narrowest tile a row may use (badge, grip and a picture between). */
export const COMPACT_MIN_TILE_WIDTH = 88;
export const COMPACT_GAP = 10;

/**
 * Compact columns: the regular count, or more when that puts every picture
 * in one row with tiles at least COMPACT_MIN_TILE_WIDTH wide; otherwise as
 * many as fit at that width.
 */
export function compactColumns(availableWidth: number, count: number): number {
  const regular = gridColumns(availableWidth);
  const fit = Math.floor((availableWidth + COMPACT_GAP) / (COMPACT_MIN_TILE_WIDTH + COMPACT_GAP));
  return Math.max(regular, Math.min(count, fit));
}

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
  const columns = compact ? compactColumns(availableWidth, count) : gridColumns(availableWidth);
  const gap = compact ? COMPACT_GAP : columns === 4 ? 16 : 12;
  const tileWidth = gridItemWidth(availableWidth, columns, gap);
  const preferred = columns >= 4 ? DESKTOP_IMAGE_HEIGHT : PHONE_IMAGE_HEIGHT;
  const room = availableHeight - gridTop;
  if (!(room > 0) || count <= 0) return { columns, gap, tileWidth, imageHeight: preferred };
  const rows = Math.ceil(count / columns);
  const perRow = (room - gap * (rows - 1)) / rows;
  const fit = Math.floor(perRow - (compact ? COMPACT_TILE_CHROME : TILE_CHROME));
  const floor = compact ? COMPACT_MIN_IMAGE_HEIGHT : MIN_IMAGE_HEIGHT;
  return { columns, gap, tileWidth, imageHeight: Math.min(preferred, Math.max(floor, fit)) };
}
