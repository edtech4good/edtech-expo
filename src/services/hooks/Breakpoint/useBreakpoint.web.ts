import { useMediaQuery } from 'react-responsive';

import { Metrics } from '@/themes';

interface Props {
  desktop?: any;
  tablet?: any;
  phablet?: any;
  mobile?: any;
}

export default function useBreakpoint({
  desktop,
  mobile,
  tablet,
  phablet,
}: Props) {
  const isDesktop = useMediaQuery({
    minWidth: Metrics.breakpoints.DESKTOP_MIN_WIDTH,
  });
  const isTablet = useMediaQuery({
    maxWidth: Metrics.breakpoints.TABLET_MAX_WIDTH,
    minWidth: Metrics.breakpoints.TABLET_MIN_WIDTH,
  });
  const isPhablet = useMediaQuery({
    maxWidth: Metrics.breakpoints.PHABLET_MAX_WIDTH,
    minWidth: Metrics.breakpoints.PHABLET_MIN_WIDTH,
  });

  const isMobile = useMediaQuery({
    maxWidth: Metrics.breakpoints.MOBILE_MAX_WIDTH,
  });

  // return phablet;

  // return phablet;
  if (isDesktop) return desktop;
  if (isMobile) return mobile;
  if (isTablet) return tablet;
  if (isPhablet) {
    if (phablet) return phablet;
    else return tablet;
  }
}
