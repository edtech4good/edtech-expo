// Corporate multiple choice, pictures (templates 2 and 4): grading, selection
// and tile sizing. No react-native imports (tested in plain node:
// `yarn test:mcqimage`).
//
// Grading is today's rule, shared with the kids renderer and the text half
// (gradeMcqText): PracticeMCQImage's submit is that same rule word for word,
// so for the same final selection `iscorrect` and `answer` equal what the
// kids path sends, in the same order. The re-exports below keep one rule.
//
// Selection follows selectionMode.ts (templates 1 and 2 single-select in
// corporate, with the multi-correct fallback; 3 and 4 multi).

import type { BodyLayout } from '../types';

export {
  evaluateMcqText as evaluateMcqImage,
  mcqOptionState as imageOptionState,
  toggleSelection,
} from '../mcqTextLogic';
export type { McqOptionState as ImageOptionState } from '../mcqTextLogic';
export { selectionModeFor, selectOption, selectionRoles } from '../selectionMode';

/** Gap between cards, both ways (regular, compact). */
export const GRID_GAP = 12;
export const COMPACT_GRID_GAP = 8;
/**
 * A card's border plus padding, each side. Constant across states (1 + 7 by
 * default, 2 + 6 chosen), so a card never changes size when it is chosen.
 */
export const CARD_FRAME = 8;
export const COMPACT_CARD_FRAME = 4;
/** Space under the picture in the regular layout: the gap, then the caption row. */
export const CARD_CAPTION = 6 + 48;
/**
 * The smallest picture in the regular layout. Below #109's 96 because two rows
 * and the result strip must fit a portrait phone without scrolling; a 72
 * point picture is still legible, and the learner has already chosen once
 * the strip shows.
 */
export const REGULAR_MIN_TILE = 72;
/**
 * The smallest picture in the compact layout (a phone on its side). About 64
 * is what fits before Submit; after it the result strip takes most of the
 * short screen (more with an audio heading), and the floor is what keeps the
 * learner's own mark in view without scrolling.
 */
export const COMPACT_MIN_TILE = 36;

export interface ImageGridPlan {
  columns: number;
  /** Side of each square picture, in px. */
  side: number;
  compact: boolean;
  /** The card's border plus padding, each side. */
  frame: number;
  gap: number;
}

/**
 * Columns and picture side, from the space the shell measured (`layout`),
 * never from the window.
 *
 * Regular: a 2x2 for four options (two columns; one for a lone option),
 * captions under the pictures. The side is the width-breakpoint size clamped
 * to the cell (`availableWidth`) and to the height (`availableHeight`, which
 * already drops by the result strip when it shows, so the learner's own mark
 * is never behind it), never below REGULAR_MIN_TILE for height.
 *
 * Compact (a phone on its side): one row, captions on the picture, tiles
 * down to COMPACT_MIN_TILE. As many columns as fit at that size, the rest on
 * further rows.
 *
 * Until the shell has measured (`layout` is null) the plan is the
 * breakpoint size, and the body renders hidden.
 */
export function planImageGrid(args: {
  count: number;
  breakpointSize: number;
  layout: BodyLayout | null;
}): ImageGridPlan {
  const { count, breakpointSize, layout } = args;
  if (!layout) {
    return { columns: count <= 1 ? 1 : 2, side: breakpointSize, compact: false, frame: CARD_FRAME, gap: GRID_GAP };
  }
  const { availableWidth: W, availableHeight: H } = layout;
  if (layout.compact) {
    const frame = COMPACT_CARD_FRAME;
    const gap = COMPACT_GRID_GAP;
    const perCard = COMPACT_MIN_TILE + 2 * frame;
    const columns = Math.max(1, Math.min(count, Math.floor((W + gap) / (perCard + gap))));
    const rows = Math.max(1, Math.ceil(count / columns));
    const cell = Math.floor((W - gap * (columns - 1)) / columns);
    const heightSide = Math.floor((H - gap * (rows - 1)) / rows) - 2 * frame;
    const side = Math.min(
      breakpointSize,
      cell - 2 * frame,
      Math.max(COMPACT_MIN_TILE, heightSide),
    );
    return { columns, side: Math.max(1, Math.floor(side)), compact: true, frame, gap };
  }
  const columns = count <= 1 ? 1 : 2;
  const rows = Math.max(1, Math.ceil(count / columns));
  const cell = Math.floor((W - GRID_GAP * (columns - 1)) / columns);
  const perRow = (H - GRID_GAP * (rows - 1)) / rows;
  const heightSide = Math.floor(perRow - 2 * CARD_FRAME - CARD_CAPTION);
  const side = Math.min(
    breakpointSize,
    cell - 2 * CARD_FRAME,
    Math.max(REGULAR_MIN_TILE, heightSide),
  );
  return { columns, side: Math.max(1, Math.floor(side)), compact: false, frame: CARD_FRAME, gap: GRID_GAP };
}

/** Width of the grid for a plan: exactly `columns` cards and their gaps. */
export function planWidth(plan: ImageGridPlan): number {
  return plan.columns * (plan.side + 2 * plan.frame) + (plan.columns - 1) * plan.gap;
}

/** Height of the grid for a plan, for `count` cards, excluding captions' growth (regular: a caption row under each picture). */
export function planHeight(plan: ImageGridPlan, count: number): number {
  const rows = Math.max(1, Math.ceil(count / plan.columns));
  const per = plan.side + 2 * plan.frame + (plan.compact ? 0 : CARD_CAPTION);
  return rows * per + (rows - 1) * plan.gap;
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

/**
 * The accessible name of a picture option. Its own text when it has some;
 * otherwise "Picture A", "Picture B" by position on screen (so it does not
 * say which is right), plus that the picture is missing when it is. The
 * result mark is added to the label by the card; `checked` (the state) stays
 * the learner's own selection.
 */
export function optionAccessibleName(args: {
  text: string | null | undefined;
  pictureName: string;
  /** The "image unavailable" text when the picture is missing, else null. */
  unavailable: string | null;
}): string {
  const text = typeof args.text === 'string' ? args.text.trim() : '';
  if (text.length > 0) return text;
  return args.unavailable ? `${args.pictureName}, ${args.unavailable}` : args.pictureName;
}

/** "A", "B", ... for the option at `index` (position on screen). */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

/**
 * The control drawn on a card: a radio for a single answer, a checkbox for
 * several, so the two never look alike.
 */
export function indicatorKind(mode: 'single' | 'multi'): 'radio' | 'checkbox' {
  return mode === 'multi' ? 'checkbox' : 'radio';
}

/**
 * Whether an option is `checked` (for the screen reader and the control): the
 * learner's own selection and nothing else. It is not the result: after
 * Submit a wrong option the learner chose stays checked (its label says
 * "incorrect"), and a correct option revealed by Show answer is not checked
 * (its label says "correct answer").
 */
export function isChecked(
  selections: Readonly<Record<string, unknown>>,
  id: string,
): boolean {
  const v = selections[id];
  return v !== undefined && v !== null && !(typeof v === 'object' && Object.keys(v as object).length === 0);
}
