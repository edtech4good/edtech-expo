import { useHeaderHeight } from '@react-navigation/elements';
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function useScreenDimension() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width, height } = useWindowDimensions();

  const unblockHeight = useMemo(
    () => height - insets.top - insets.bottom,
    [height, insets, headerHeight],
  );

  const unblockHeightWithoutHeader = useMemo(
    () => unblockHeight - headerHeight,
    [unblockHeight, headerHeight],
  );

  // console.log('Header: ', headerHeight);
  // console.log('un: ', unblockHeight);
  // console.log('en: ', unblockHeightWithoutHeader);

  return {
    windowWidth: width,
    windowHeight: height,
    unblockHeight,
    headerHeight,
    unblockHeightWithoutHeader,
  };
}
