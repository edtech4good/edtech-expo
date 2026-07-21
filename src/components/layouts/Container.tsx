import { useHeaderHeight } from '@react-navigation/elements';
import { useMemo } from 'react';
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
}

const ContainerView = styled.View.attrs<Props>((props: Props) => ({
  height: props.containerHeight,
  width: props.containerWidth,
  backgroundColor: props.backgroundColor,
  justifyContent: props.justifyContent,
  alignItems: props.alignItems,
  borderRadius: props.borderRadius,
  paddingTop: props.paddingTop,
  paddingBottom: props.paddingBottom,
  paddingLeft: props.paddingLeft,
  paddingRight: props.paddingRight,
}))`
  width: ${props => (props.containerWidth != null ? `${props.containerWidth}px` : '100%')};
  height: ${props => props.containerHeight}px;
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
  style,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const appHeaderHeight = useHeaderHeight();
  const { height } = useWindowDimensions();

  const screenHeightWithoutStatusBar = useMemo(
    () => height - insets.bottom,
    [insets, height],
  );
  const resultHeight = useMemo(
    () =>
      removeHeaderSize
        ? screenHeightWithoutStatusBar - appHeaderHeight
        : screenHeightWithoutStatusBar,
    [removeHeaderSize],
  );

  return (
    <ContainerView
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
