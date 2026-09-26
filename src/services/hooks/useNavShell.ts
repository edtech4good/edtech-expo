import { useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';
import useDesign from './useDesign';

export type NavShell = 'sidebar' | 'rail' | 'tabs' | 'drawer';

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
 * - 'tabs'    corporate theme below tablet width — a bottom tab bar
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

  const isSidebar = isCorporate && width >= theme.breakpoints.SIDEBAR_MIN_WIDTH;
  const isRail =
    isCorporate &&
    width >= theme.breakpoints.DEFAULT_MIN_WIDTH &&
    width < theme.breakpoints.SIDEBAR_MIN_WIDTH;
  const isTabs = isCorporate && width < theme.breakpoints.DEFAULT_MIN_WIDTH;
  const isDrawer = !isSidebar && !isRail && !isTabs;
  const hasPermanentNav = isSidebar || isRail;

  const shell: NavShell = isSidebar
    ? 'sidebar'
    : isRail
    ? 'rail'
    : isTabs
    ? 'tabs'
    : 'drawer';

  return {
    shell,
    isSidebar,
    isRail,
    isTabs,
    isDrawer,
    hasPermanentNav,
  } as const;
}
