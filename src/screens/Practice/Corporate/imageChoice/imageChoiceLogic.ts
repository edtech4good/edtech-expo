// Corporate multiple choice, pictures (templates 2 and 4): grading, selection
// and tile sizing. No react-native imports (tested in plain node:
// `yarn test:mcqimage`).
//
// Grading is today's rule, shared with the kids renderer and the text half
// (gradeMcqText): PracticeMCQImage's submit is that same rule word for word,
// so `iscorrect` and `answer` equal what the kids path sends for the same
// taps, in the same order. The re-exports below keep one rule, not a copy.
import { MIN_TILE_SIZE, imageTileSize } from '../../Components/MCQImage/layout';

export {
  evaluateMcqText as evaluateMcqImage,
  mcqOptionState as imageOptionState,
  toggleSelection,
} from '../mcqTextLogic';
export type { McqOptionState as ImageOptionState } from '../mcqTextLogic';

/** Both picture templates: 2 (single) and 4 (multi). Today both toggle several options. */
export function isMultiTemplate(templatetypeid: unknown): boolean {
  return Number(templatetypeid) === 4;
}

/** Gap between cards, both ways. */
export const GRID_GAP = 12;
/** A card's border plus padding, each side. Constant across states: 1 + 7 by default, 2 + 6 selected. */
export const CARD_FRAME = 8;
/** Space under the picture: the gap, then the caption row (radio, text, 44pt audio circle). */
export const CARD_CAPTION = 6 + 48;
/**
 * Room the footer and the safe area take below the body, used only to work
 * out how tall the tiles may be. A soft cap: the page scrolls, and Submit is
 * in the footer outside the scroll, so a wrong guess costs a little scrolling,
 * never a hidden button.
 */
export const FOOTER_RESERVE = 96;

export interface ImageGridPlan {
  columns: number;
  /** Side of each square picture, in px. */
  side: number;
}

function sideFor(args: {
  count: number;
  columns: number;
  breakpointSize: number;
  gridWidth: number | null;
  availableHeight: number | null;
}): number {
  const { count, columns, breakpointSize, gridWidth, availableHeight } = args;
  const rows = Math.max(1, Math.ceil(count / columns));
  let cap = breakpointSize;
  if (gridWidth !== null) {
    const cell = Math.floor((gridWidth - GRID_GAP * (columns - 1)) / columns);
    cap = Math.min(cap, cell - 2 * CARD_FRAME);
  }
  let side = cap;
  if (availableHeight !== null) {
    const perRow = (availableHeight - GRID_GAP * (rows - 1)) / rows;
    side = imageTileSize({
      breakpointSize: cap,
      available: perRow - 2 * CARD_FRAME - CARD_CAPTION,
    });
  }
  return Math.max(1, Math.floor(side));
}

/**
 * Columns and picture side for the option grid: a 2x2 for four options (two
 * columns; one for a lone option), so the cards line up in the 760 column.
 *
 * The side is the width-breakpoint size clamped to the cell the grid really
 * has (`gridWidth`, from onLayout) and to the height left below the question
 * (`availableHeight`, measured from the body's own position in the window),
 * never below MIN_TILE_SIZE for height (a picture stops being legible) but
 * never wider than its cell. Until the grid is measured the breakpoint size
 * is used.
 *
 * One exception to the 2x2: when the height is so short that two rows would
 * shrink the pictures to the minimum (a landscape phone), a single row of
 * three or four is used instead, when its pictures are at least as large. It
 * takes half the height, so less of the page has to scroll.
 */
export function planImageGrid(args: {
  count: number;
  breakpointSize: number;
  gridWidth: number | null;
  availableHeight: number | null;
}): ImageGridPlan {
  const { count } = args;
  const two = count <= 1 ? 1 : 2;
  const twoSide = sideFor({ ...args, columns: two });
  if (count >= 3 && count <= 4 && args.availableHeight !== null) {
    const rowSide = sideFor({ ...args, columns: count });
    if (twoSide <= MIN_TILE_SIZE && rowSide >= twoSide) return { columns: count, side: rowSide };
  }
  return { columns: two, side: twoSide };
}

/** Width of the grid for a plan: exactly `columns` cards and their gaps. */
export function planWidth(plan: ImageGridPlan): number {
  return plan.columns * (plan.side + 2 * CARD_FRAME) + (plan.columns - 1) * GRID_GAP;
}

/**
 * Height left for the option grid: the window, less the body's top edge
 * (`bodyTop`, window coordinates), the footer/safe-area reserve and the
 * space the page's own padding needs below.
 */
export function availableGridHeight(args: {
  windowHeight: number;
  bodyTop: number;
  bottomReserve: number;
}): number {
  return Math.max(0, args.windowHeight - args.bodyTop - args.bottomReserve);
}

/** filetype 1 = AUDIO, 6 = IMAGE (the API's filetype enum). */
const FILETYPE_AUDIO = 1;

/**
 * Which file names an option's picture and audio come from. An option holds
 * one `questionoptionfile`: a picture in the normal case. If that file is an
 * audio clip the option has no picture (it gets the labelled placeholder)
 * and the clip is its audio circle. Today's picture tile has no audio, so a
 * picture option shows no circle.
 */
export function optionMediaNames(option: {
  questionoptionfile?: { filename?: string; filetype?: number } | null;
}): { image: string; audio: string } {
  const file = option?.questionoptionfile;
  const name = typeof file?.filename === 'string' ? file.filename : '';
  return file?.filetype === FILETYPE_AUDIO
    ? { image: '', audio: name }
    : { image: name, audio: '' };
}
