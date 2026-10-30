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
