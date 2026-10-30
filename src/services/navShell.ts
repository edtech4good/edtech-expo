/**
 * Which nav shell the outer layout renders, as plain data (no native modules),
 * so it can be tested under node. useNavShell reads it. See useNavShell for
 * what each shell is.
 *
 * A PHONE is always 'tabs' in the corporate theme, whatever its window width.
 * Phones are locked to portrait except while the lesson video is full screen
 * (edtech-expo#143); a phone in landscape is 800+ dp wide, which by width
 * alone is the tablet rail, and the home layout swaps Tabs for Drawer at that
 * width, remounting everything under it: the lesson, mid-video, would be torn
 * down and the learner dropped on Home the moment the phone turned.
 */
export type NavShell = 'sidebar' | 'rail' | 'tabs' | 'drawer';

export function navShellFor(input: {
  isCorporate: boolean;
  width: number;
  isPhone: boolean;
  sidebarMinWidth: number;
  defaultMinWidth: number;
}): NavShell {
  const { isCorporate, width, isPhone, sidebarMinWidth, defaultMinWidth } =
    input;
  if (!isCorporate) return 'drawer';
  if (isPhone) return 'tabs';
  if (width >= sidebarMinWidth) return 'sidebar';
  if (width >= defaultMinWidth) return 'rail';
  return 'tabs';
}

/**
 * While a lesson's video screen is mounted (full screen or not) the shell is
 * frozen at the value it had when the lesson opened: turning a phone (or
 * resizing a browser) across the rail threshold would otherwise swap Tabs for
 * Drawer in the home layout and remount the lesson under the video, and
 * leaving full screen in the other orientation would drop the learner on Home.
 * Leaving the lesson unfreezes it; a swap after that only remounts Home.
 * Returns the shell to render and the frozen value to keep for the next render
 * (null when not holding).
 */
export function resolveShell(
  live: NavShell,
  hold: boolean,
  frozen: NavShell | null,
): { shell: NavShell; frozen: NavShell | null } {
  if (!hold) return { shell: live, frozen: null };
  const kept = frozen ?? live;
  return { shell: kept, frozen: kept };
}
