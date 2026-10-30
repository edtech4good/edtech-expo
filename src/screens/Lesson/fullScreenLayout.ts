/**
 * The full-screen layout rule (edtech-expo#143), kept pure so it can be
 * tested under node: the video takes the space the control bar leaves, and
 * the two never overlap (the first build floated the bar over the lower half
 * of a landscape phone's video).
 */

/** At or above this window width the full-screen bar is one compact row. */
export const SINGLE_ROW_MIN_WIDTH = 640;

/** Bar height assumed until the bar has been measured once. */
export const BAR_HEIGHT_ESTIMATE = 80;

export const isSingleRowBar = (windowWidth: number): boolean =>
  windowWidth >= SINGLE_ROW_MIN_WIDTH;

export interface Box {
  width: number;
  height: number;
}

/**
 * The video's box in the full-screen window. Landscape: the whole width and
 * all the height the bar leaves. Portrait: full width at 16:9, but never
 * taller than the bar leaves. In both, height + barHeight <= window height.
 */
export function fullScreenVideoBox(win: Box, barHeight: number): Box {
  const room = Math.max(0, win.height - Math.max(0, barHeight));
  if (win.width > win.height) return { width: win.width, height: room };
  return {
    width: win.width,
    height: Math.min(Math.round((win.width * 9) / 16), room),
  };
}
