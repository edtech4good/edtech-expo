// Pure style rules for the corporate question kit. No react-native imports
// (this file is loaded by plain node/tsx in the tests), and no hex: every
// colour comes from the theme tokens passed in.
import hexAlpha from '../../utils/hexAlpha';
import type { ThemeColors } from '../../themes/tokens/types';

export type KitColors = Pick<
  ThemeColors,
  | 'surface'
  | 'surfaceVariant'
  | 'outline'
  | 'divider'
  | 'primary'
  | 'primaryLight'
  | 'primaryDark'
  | 'onBackground'
  | 'onSurfaceVariant'
  | 'secondaryLight'
  | 'success'
  | 'onSuccess'
  | 'successText'
  | 'error'
  | 'onPrimary'
>;

/** Tint strengths from the approved design: mint 10%, orange 8%. */
export const CORRECT_TINT_ALPHA = 0.1;
export const INCORRECT_TINT_ALPHA = 0.08;

export type TileState =
  | 'default'
  | 'picked'
  | 'dragging'
  | 'placed'
  | 'correct'
  | 'incorrect'
  | 'disabled';

export const TILE_STATES: ReadonlyArray<TileState> = [
  'default',
  'picked',
  'dragging',
  'placed',
  'correct',
  'incorrect',
  'disabled',
];

export interface TileFrame {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  /** White-face tiles with a soft shadow; result and locked tiles are flat. */
  raised: boolean;
  /** The deeper shadow of a tile being dragged. */
  lifted: boolean;
  /** The grip glyph shows only while the tile can still be moved. */
  showGrip: boolean;
  /** The ✓ / ✕ disc, or null. */
  mark: 'correct' | 'incorrect' | null;
  textColor: string;
  /** Horizontal padding of a text tile (2px borders and a mark shift it). */
  paddingLeft: number;
  paddingRight: number;
}

/**
 * The frame of a movable tile for a state. Numbers follow the approved
 * mockups (question-types-corporate-v2.html): 1.5px edge by default, 2px for
 * picked / dragging / results, padding reduced by the extra 0.5px so the
 * tile never changes size between states.
 */
export function tileFrame(colors: KitColors, state: TileState): TileFrame {
  const base: TileFrame = {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderWidth: 1.5,
    raised: true,
    lifted: false,
    showGrip: true,
    mark: null,
    textColor: colors.onBackground,
    paddingLeft: 9,
    paddingRight: 14,
  };
  switch (state) {
    case 'picked':
      return {
        ...base,
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 2,
        textColor: colors.primaryDark,
        paddingLeft: 8.5,
        paddingRight: 13.5,
      };
    case 'dragging':
      return {
        ...base,
        borderColor: colors.primary,
        borderWidth: 2,
        raised: false,
        lifted: true,
        paddingLeft: 8.5,
        paddingRight: 13.5,
      };
    case 'placed':
      // Placed in a slot or blank: flat, with no grip (it is not dragged).
      return { ...base, raised: false, showGrip: false, paddingLeft: 14, paddingRight: 14 };
    case 'correct':
      return {
        ...base,
        backgroundColor: hexAlpha(colors.success, CORRECT_TINT_ALPHA),
        borderColor: colors.success,
        borderWidth: 2,
        raised: false,
        showGrip: false,
        mark: 'correct',
        paddingLeft: 13.5,
        paddingRight: 8,
      };
    case 'incorrect':
      return {
        ...base,
        backgroundColor: hexAlpha(colors.error, INCORRECT_TINT_ALPHA),
        borderColor: colors.error,
        borderWidth: 2,
        raised: false,
        showGrip: false,
        mark: 'incorrect',
        paddingLeft: 13.5,
        paddingRight: 8,
      };
    case 'disabled':
      // Locked after submit: flat, no grip, same face.
      return {
        ...base,
        raised: false,
        showGrip: false,
        borderColor: colors.divider,
        paddingLeft: 14,
        paddingRight: 14,
      };
    default:
      return base;
  }
}

export interface SlotFrame {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: 'dashed' | 'solid';
  textColor: string;
  /** A vertical caret in the middle (the next blank to fill). */
  caret: boolean;
}

export type SlotState =
  | 'empty'
  | 'target'
  | 'hover'
  | 'active'
  | 'filled'
  | 'correct'
  | 'incorrect';

export const SLOT_STATES: ReadonlyArray<SlotState> = [
  'empty',
  'target',
  'hover',
  'active',
  'filled',
  'correct',
  'incorrect',
];

/** The flat slot / blank: dashed when empty, solid when something is in it. */
export function slotFrame(colors: KitColors, state: SlotState): SlotFrame {
  switch (state) {
    case 'target':
      // Something is picked and this slot can take it.
      return {
        backgroundColor: colors.surface,
        borderColor: colors.primary,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        textColor: colors.primary,
        caret: false,
      };
    case 'hover':
      return {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 2,
        borderStyle: 'solid',
        textColor: colors.primaryDark,
        caret: false,
      };
    case 'active':
      return {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 2,
        borderStyle: 'solid',
        textColor: colors.primaryDark,
        caret: true,
      };
    case 'filled':
      return {
        backgroundColor: colors.surface,
        borderColor: colors.outline,
        borderWidth: 1.5,
        borderStyle: 'solid',
        textColor: colors.onBackground,
        caret: false,
      };
    case 'correct':
      return {
        backgroundColor: hexAlpha(colors.success, CORRECT_TINT_ALPHA),
        borderColor: colors.success,
        borderWidth: 2,
        borderStyle: 'solid',
        textColor: colors.onBackground,
        caret: false,
      };
    case 'incorrect':
      return {
        backgroundColor: hexAlpha(colors.error, INCORRECT_TINT_ALPHA),
        borderColor: colors.error,
        borderWidth: 2,
        borderStyle: 'solid',
        textColor: colors.onBackground,
        caret: false,
      };
    default:
      return {
        backgroundColor: colors.surfaceVariant,
        borderColor: colors.secondaryLight,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        textColor: colors.onSurfaceVariant,
        caret: false,
      };
  }
}

/**
 * The tile frame as a plain style object, for ReorderableList's `frameFor`
 * (the list draws the frame; this restyles it for a result). Colours,
 * borders and padding only: the shadow is dropped by the caller's choice.
 */
export function tileFrameStyle(colors: KitColors, state: TileState) {
  // Cached per colours object and state, so the same reference comes back
  // every render and ReorderableList's memo(Tile) is not defeated.
  let byState = frameStyleCache.get(colors);
  if (!byState) {
    byState = new Map();
    frameStyleCache.set(colors, byState);
  }
  let style = byState.get(state);
  if (!style) {
    const f = tileFrame(colors, state);
    style = {
      backgroundColor: f.backgroundColor,
      borderColor: f.borderColor,
      borderWidth: f.borderWidth,
      paddingLeft: f.paddingLeft,
      paddingRight: f.paddingRight,
    };
    byState.set(state, style);
  }
  return style;
}

type FrameStyle = {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  paddingLeft: number;
  paddingRight: number;
};
const frameStyleCache = new WeakMap<object, Map<TileState, FrameStyle>>();
