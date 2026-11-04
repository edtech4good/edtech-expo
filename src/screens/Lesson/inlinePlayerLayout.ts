/**
 * The inline (not full screen) lesson player's box, kept pure so it can be
 * tested under node. The lesson screen sits beside the corporate theme's
 * permanent nav (the 248 sidebar or the 88 rail), so it has the window minus
 * that nav, not the whole window: a player sized to the window runs under the
 * nav and past the right edge. Full screen covers the whole window and does
 * not use this (see fullScreenLayout.ts).
 */
import type { Box } from './fullScreenLayout';

export interface InlinePlayerInput {
  /** The window, as useWindowDimensions reports it. */
  window: Box;
  /** Width the permanent nav takes from the window; 0 when there is none. */
  navWidth: number;
  /** Height of the offline banner above the screen; 0 when hidden. */
  offlineBannerHeight: number;
  /**
   * The control bar stacks under the video instead of floating over it (a
   * permanent nav, in landscape). Then the video takes the room the bar
   * leaves, so the two never overlap, as in full screen.
   */
  barBelow?: boolean;
  /** The stacked bar's height (measured, or an estimate before the first). */
  barHeight?: number;
}

/** Stacked bar height assumed until the bar has been measured once. */
export const INLINE_BAR_HEIGHT_ESTIMATE = 150;

export interface InlinePlayerLayout {
  /** The room the lesson screen really has, left to right. */
  availableWidth: number;
  /** Phone-style portrait: a 16:9 box, not the whole height. */
  isPortrait: boolean;
  /** The player's box. Its picture is contained (letterboxed) inside it. */
  box: Box;
}

export function inlinePlayerLayout(input: InlinePlayerInput): InlinePlayerLayout {
  const { window, navWidth, offlineBannerHeight } = input;
  const barBelow = input.barBelow ?? false;
  const barHeight = Math.max(0, input.barHeight ?? 0);
  const availableWidth = Math.max(0, window.width - Math.max(0, navWidth));
  // Orientation stays a property of the window, as before, so phones (no
  // permanent nav) keep exactly the layout they had.
  const isPortrait = window.height > window.width;
  const room = Math.max(0, window.height - Math.max(0, offlineBannerHeight));
  const wide = Math.round((availableWidth * 9) / 16);
  // Landscape keeps the full-height player. With the bar below it, the video
  // is 16:9 at most, and never taller than the bar leaves.
  const height = isPortrait
    ? wide
    : barBelow
    ? Math.min(wide, Math.max(0, room - barHeight))
    : room;
  return { availableWidth, isPortrait, box: { width: availableWidth, height } };
}

/**
 * The control bar's width. The bar caps at `maxWidth` on wide screens, but
 * never exceeds the room the screen has (the rail leaves a 768 window 680).
 */
export const controlBarWidth = (
  breakpointWidth: number,
  availableWidth: number,
): number => Math.min(breakpointWidth, availableWidth);
