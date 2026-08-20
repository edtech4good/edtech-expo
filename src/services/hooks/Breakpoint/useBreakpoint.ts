import { useWindowDimensions } from 'react-native';

import { Metrics } from '@/themes';

interface Props {
  desktop?: any;
  tablet?: any;
  phablet?: any;
  mobile?: any;
}

/**
 * Single width-based breakpoint selector, shared by web and native.
 *
 * This replaced a broken platform split: Metro used to resolve
 * useBreakpoint.web.ts (react-responsive media queries, width-driven and
 * correct) on web, but useBreakpoint.native.ts on Android/iOS — a gutted
 * stub that ignored width entirely and always returned `phablet ?? mobile`.
 * A third file, this one, was the only variant tsc ever checked, so what
 * shipped on native was never what typechecked. See ROADMAP Track B
 * (responsive-first foundation) for context.
 *
 * `useWindowDimensions()` is live on both web and native, so a single
 * width-bucketed implementation works everywhere Metro resolves this file.
 *
 * Bucket boundaries mirror src/themes/Metrics/Metrics.ts `breakpoints`. The
 * selection is a descending >= chain, total over every positive width (no
 * gaps between buckets for fractional widths like 767.5, which real Android
 * useWindowDimensions can report):
 *   width >= DESKTOP_MIN_WIDTH (1281)   -> desktop
 *   width >= TABLET_MIN_WIDTH (921)     -> tablet
 *   width >= PHABLET_MIN_WIDTH (768)    -> phablet, falling back to tablet
 *                                          when phablet is undefined
 *   otherwise (< 768)                   -> mobile
 */
export default function useBreakpoint({
  desktop,
  mobile,
  tablet,
  phablet,
}: Props) {
  const { width } = useWindowDimensions();
  const { breakpoints } = Metrics;

  if (width >= breakpoints.DESKTOP_MIN_WIDTH) return desktop;
  if (width >= breakpoints.TABLET_MIN_WIDTH) return tablet;
  if (width >= breakpoints.PHABLET_MIN_WIDTH) {
    if (phablet) return phablet;
    return tablet;
  }
  return mobile;
}
