// The space the corporate shell gives its body, from measured boxes. No
// react-native imports (tested in plain node: `yarn test:shell`).
//
// The shell measures two things with onLayout: its ScrollView (the viewport
// the question scrolls in, which ends where the footer starts) and the
// question card. The body's height is what is left of the viewport below
// the card. The footer sits outside the ScrollView, so when the result
// strip appears the footer grows, the ScrollView's onLayout reports a
// shorter viewport, and the body is told the smaller height: nothing is
// guessed, and a body that fits itself to `availableHeight` refits on its
// own after Submit.
import type { BodyLayout } from './types';

/** The column cap, as QuestionColumn (kept here so this file stays pure). */
export const SHELL_COLUMN_WIDTH = 760;

/**
 * Below this many points for the body, the question switches to its compact
 * layout (a smaller card, and bodies fit more tightly).
 *
 * Why 260: it is the smallest body the regular layouts were drawn for.
 * Four text options stacked are 4 x 56 + 3 x 12 = 260; two rows of
 * picture tiles at the design's smallest regular size with their captions
 * are about the same. Every portrait phone we target clears it (a 390 x 812
 * phone leaves over 400 even with the result strip showing); a phone on its
 * side does not (812 x 375 leaves under 100), which is the case the compact
 * layout is for.
 */
export const COMPACT_BELOW = 260;

/** The shell's own spacing, regular and compact (points). */
export interface ShellSpacing {
  /** The ScrollView's vertical padding, top and bottom. */
  scrollPadding: number;
  /** The gap between the question card and the body. */
  cardGap: number;
}

export const REGULAR_SPACING: ShellSpacing = { scrollPadding: 16, cardGap: 16 };
export const COMPACT_SPACING: ShellSpacing = { scrollPadding: 8, cardGap: 10 };

export function shellSpacing(compact: boolean): ShellSpacing {
  return compact ? COMPACT_SPACING : REGULAR_SPACING;
}

export interface ShellMeasures {
  /** The ScrollView's frame (onLayout), or null before its first layout. */
  viewport: { width: number; height: number } | null;
  /** The question card's height as it is drawn now (onLayout), or null. */
  cardHeight: number | null;
  /**
   * The card's height the last time it was drawn in the regular layout.
   * Compact is decided on this, never on the compact card's height:
   * deciding on the card as drawn would loop (a compact card is shorter,
   * which leaves more room, which turns compact off, which makes the card
   * taller again). The first frame is always regular, so it is known
   * before compact can turn on.
   */
  regularCardHeight: number | null;
  /**
   * The height the result strip adds to the footer while it shows (the
   * strip's onLayout plus the footer's row gap), else 0. Compact is decided
   * as if the strip were not there, so Submit never switches the card to
   * compact under the learner's finger: the body is told the smaller
   * height and refits, and the card stays as it was.
   */
  stripHeight: number;
  /** The gutter QuestionColumn puts on each side. */
  gutter: number;
}

/**
 * The layout the body gets, or null until both the viewport and the card
 * have been measured once (the first frame).
 */
export function computeBodyLayout(m: ShellMeasures): BodyLayout | null {
  if (!m.viewport || m.cardHeight == null) return null;
  const width =
    Math.min(m.viewport.width, SHELL_COLUMN_WIDTH + m.gutter * 2) - m.gutter * 2;

  // Compact: would the regular card, with the strip hidden, leave the body
  // less than COMPACT_BELOW?
  const regular = REGULAR_SPACING;
  const regularCard = m.regularCardHeight ?? m.cardHeight;
  const roomIfRegular =
    m.viewport.height +
    m.stripHeight -
    regular.scrollPadding * 2 -
    regularCard -
    regular.cardGap;
  const compact = roomIfRegular < COMPACT_BELOW;

  // Available: what is really left, below the card as it is drawn. (For
  // the one frame after compact switches, cardHeight is the previous
  // card's; the card's next onLayout corrects it.)
  const now = shellSpacing(compact);
  const height =
    m.viewport.height - now.scrollPadding * 2 - m.cardHeight - now.cardGap;

  return {
    availableWidth: Math.max(0, Math.floor(width)),
    availableHeight: Math.max(0, Math.floor(height)),
    compact,
  };
}
