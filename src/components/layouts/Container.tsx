import { OfflineBannerHeightContext } from '@/services';
import { useHeaderHeight } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext, useMemo } from 'react';
import { useWindowDimensions, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

interface Props extends ViewProps {
  removeHeaderSize?: boolean;
  containerHeight?: number;
  containerWidth?: number;
  backgroundColor?: string;
  justifyContent?: string;
  alignItems?: string;
  borderRadius?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  // Fill the space the parent already gives this Container (via flexbox)
  // instead of pinning to a pixel height computed from header/tab-bar/inset
  // hooks. React Navigation already sizes a screen's content slot to
  // exactly the space between the header and the bottom tab bar, so `fill`
  // just trusts that instead of re-deriving it — which drifts whenever a
  // sibling (e.g. the corporate progress track) or the header's own height
  // changes and the manual math isn't updated to match (root cause of the
  // Practice/Quiz footer floating with a gap above the tab bar — see
  // PracticeFooter.tsx and PracticeScreen.tsx). Prefer `fill` over
  // `containerHeight` in any new usage.
  fill?: boolean;
}

const ContainerView = styled.View<Props>`
  width: ${props =>
    props.containerWidth != null ? `${props.containerWidth}px` : '100%'};
  ${props =>
    props.fill
      ? 'flex: 1; align-self: stretch;'
      : `height: ${props.containerHeight}px;`}
  background-color: ${props =>
    props.backgroundColor ?? props.theme.colors.background};
  flex-direction: column;
  justify-content: ${props => props.justifyContent ?? 'flex-start'};
  align-items: ${props => props.alignItems ?? 'center'};
  border-radius: ${props => props.borderRadius ?? 0}px;
  padding-top: ${props => props.paddingTop ?? 0}px;
  padding-bottom: ${props => props.paddingBottom ?? 0}px;
  padding-left: ${props => props.paddingLeft ?? 0}px;
  padding-right: ${props => props.paddingRight ?? 0}px;
`;

function Container({
  removeHeaderSize = false,
  children,
  containerHeight,
  containerWidth,
  backgroundColor,
  justifyContent,
  alignItems,
  borderRadius,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  fill = false,
  style,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const appHeaderHeight = useHeaderHeight();
  const { height } = useWindowDimensions();
  // The corporate phone shell renders a bottom Tabs navigator (see
  // useNavShell). Screens that pin their height off the window need to
  // leave room for that bar, or content/footers render underneath it.
  // BottomTabBarHeightContext (not useBottomTabBarHeight, which throws
  // outside a tab navigator) is undefined -> 0 under the kids drawer and
  // corporate rail shells, so this is byte-identical to today there.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  // The visible corporate OfflineBanner (OfflineBannerFrame) adds its own
  // height above route content; subtract it the same way as tabBarHeight so
  // fixed-height Containers don't clip under it when offline.
  const offlineBannerHeight = useContext(OfflineBannerHeightContext);

  const screenHeightWithoutStatusBar = useMemo(
    () => height - insets.bottom - tabBarHeight - offlineBannerHeight,
    [insets, height, tabBarHeight, offlineBannerHeight],
  );
  const resultHeight = useMemo(
    () =>
      removeHeaderSize
        ? screenHeightWithoutStatusBar - appHeaderHeight
        : screenHeightWithoutStatusBar,
    [removeHeaderSize, screenHeightWithoutStatusBar, appHeaderHeight],
  );

  return (
    <ContainerView
      fill={fill}
      containerHeight={containerHeight ?? resultHeight}
      containerWidth={containerWidth}
      backgroundColor={backgroundColor}
      justifyContent={justifyContent}
      alignItems={alignItems}
      borderRadius={borderRadius}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      paddingLeft={paddingLeft}
      paddingRight={paddingRight}
      style={style}>
      {children}
    </ContainerView>
  );
}

export default Container;
