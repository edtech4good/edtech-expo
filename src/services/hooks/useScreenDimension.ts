import { useHeaderHeight } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function useScreenDimension() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width, height } = useWindowDimensions();
  // The corporate phone shell renders a bottom Tabs navigator (see
  // useNavShell). Screens that pin their height off the window need to
  // leave room for that bar, or content/footers render underneath it.
  // BottomTabBarHeightContext (not useBottomTabBarHeight, which throws
  // outside a tab navigator) is undefined -> 0 under the kids drawer and
  // corporate rail shells, so this is byte-identical to today there.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

  const unblockHeight = useMemo(
    () => height - insets.top - insets.bottom - tabBarHeight,
    [height, insets, headerHeight, tabBarHeight],
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
