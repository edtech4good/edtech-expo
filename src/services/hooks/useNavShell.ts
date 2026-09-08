import { useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';
import useDesign from './useDesign';

export type NavShell = 'rail' | 'tabs' | 'drawer';

/**
 * Picks which nav shell the app's outer layout (and anything nested inside
 * it) should render, per ROADMAP Track B (responsive-first foundation):
 *
 * - 'rail'   corporate theme at tablet width (>= theme.breakpoints
 *            .DEFAULT_MIN_WIDTH) — a permanent left NavRail
 *            (docs/design/corporate-mobile/README.md).
 * - 'tabs'   corporate theme below tablet width — a bottom tab bar
 *            (Home, Profile) replacing the phone drawer.
 * - 'drawer' the kids theme, at any width — the existing right-side
 *            CustomDrawer, unchanged.
 *
 * Centralizing this in one hook keeps app/(app)/(home)/_layout.tsx and
 * app/(app)/(home)/home/_layout.tsx (and any nested navigator that can be
 * mounted as a screen inside either) from computing the same breakpoint
 * logic independently and drifting apart.
 */
export default function useNavShell(): {
  shell: NavShell;
  isRail: boolean;
  isTabs: boolean;
  isDrawer: boolean;
} {
  const { isCorporate } = useDesign();
  const { width } = useWindowDimensions();
  const theme = useTheme();

  const isRail = isCorporate && width >= theme.breakpoints.DEFAULT_MIN_WIDTH;
  const isTabs = isCorporate && width < theme.breakpoints.DEFAULT_MIN_WIDTH;
  const isDrawer = !isRail && !isTabs;

  const shell: NavShell = isRail ? 'rail' : isTabs ? 'tabs' : 'drawer';

  return { shell, isRail, isTabs, isDrawer } as const;
}
