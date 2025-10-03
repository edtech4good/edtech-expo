import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useMemo, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
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
  const [orientation, setOrientation] = useState<number>(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    load();
  }, []);

  const load = async () => {
    const currentOrientation = await ScreenOrientation.getOrientationAsync();
    setOrientation(currentOrientation);
    console.log('CUR: ', currentOrientation);
  };

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

  if (isDesktop) return desktop;
  if (isMobile || (Platform.OS !== 'web' && orientation === 1)) return mobile;
  if (isTablet) return tablet;
  if (
    isPhablet ||
    (Platform.OS !== 'web' && (orientation === 3 || orientation === 4))
  ) {
    if (phablet) return phablet;
    else return tablet;
  }
}
