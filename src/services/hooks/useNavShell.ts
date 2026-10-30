import { useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';
import { navShellFor, resolveShell, NavShell } from '../navShell';
import { useVideoFullScreen } from '../videoFullScreen';
import useDeviceClass from './useDeviceClass';
import useDesign from './useDesign';

export type { NavShell };

/**
 * Picks which nav shell the app's outer layout (and anything nested inside
 * it) should render, per ROADMAP Track B (responsive-first foundation):
 *
 * - 'sidebar' corporate theme at desktop width (>= theme.breakpoints
 *             .SIDEBAR_MIN_WIDTH, 1280) — a permanent 248px labelled left
 *             NavSidebar (design handoff "My progress (corporate)" →
 *             Desktop 1440×900).
 * - 'rail'    corporate theme at tablet width (DEFAULT_MIN_WIDTH, 768, up
 *             to SIDEBAR_MIN_WIDTH) — a permanent 88pt icon NavRail
 *             (docs/design/corporate-mobile/README.md).
 * - 'tabs'    corporate theme below tablet width, and on every phone
 *             whatever its window width (see navShell.ts) — a bottom tab bar
 *             (Home, Profile) replacing the phone drawer.
 * - 'drawer'  the kids theme, at any width — the existing right-side
 *             CustomDrawer, unchanged.
 *
 * `isRail` is true for the rail only. Most callers that care about "is there
 * a permanent left nav" (and its width, or the tablet type scale) want
 * `hasPermanentNav`, which covers both the rail and the sidebar.
 *
 * Centralizing this in one hook keeps app/(app)/(home)/_layout.tsx and
 * app/(app)/(home)/home/_layout.tsx (and any nested navigator that can be
 * mounted as a screen inside either) from computing the same breakpoint
 * logic independently and drifting apart.
 */
export default function useNavShell(): {
  shell: NavShell;
  isSidebar: boolean;
  isRail: boolean;
  isTabs: boolean;
  isDrawer: boolean;
  hasPermanentNav: boolean;
} {
  const { isCorporate } = useDesign();
  const { width } = useWindowDimensions();
  const theme = useTheme();

  // Native only: on the web `screen` is whatever the browser reports (a test
  // viewport is its own screen), so width alone keeps deciding there.
  const { isPhone: isPhoneDevice } = useDeviceClass();
  const isPhone = Platform.OS !== 'web' && isPhoneDevice;

  const live = navShellFor({
    isCorporate,
    width,
    isPhone,
    sidebarMinWidth: theme.breakpoints.SIDEBAR_MIN_WIDTH,
    defaultMinWidth: theme.breakpoints.DEFAULT_MIN_WIDTH,
  });
  // Frozen while the lesson video is full screen, on every platform (see
  // resolveShell): a width change must not remount the lesson under it.
  const videoFullScreen = useVideoFullScreen();
  const frozenRef = useRef<NavShell | null>(null);
  const resolved = resolveShell(live, videoFullScreen, frozenRef.current);
  frozenRef.current = resolved.frozen;
  const shell = resolved.shell;
  const isSidebar = shell === 'sidebar';
  const isRail = shell === 'rail';
  const isTabs = shell === 'tabs';
  const isDrawer = !isSidebar && !isRail && !isTabs;
  const hasPermanentNav = isSidebar || isRail;

  return {
    shell,
    isSidebar,
    isRail,
    isTabs,
    isDrawer,
    hasPermanentNav,
  } as const;
}
