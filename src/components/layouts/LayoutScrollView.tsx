import React, { ReactNode } from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from 'styled-components/native';
import styled from 'styled-components/native';
interface Props {
  alignItems?: 'flex-start' | 'flex-end' | 'center';
  backgroundColor?: string;
  children?: ReactNode;
  footer?: React.ReactElement;
  flexDirection?: 'column' | 'row' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center';
  paddingHorizontal?: number;
  paddingVertical?: number;
  useScroll?: boolean;
}

interface SafeAreaProps {
  backgroundColor?: string;
  flexDirection: string;
  justifyContent: string;
  alignItems: string;
}

export const StyledSafeArea = styled(SafeAreaView).attrs<SafeAreaProps>(
  props => ({
    backgroundColor: props.backgroundColor,
    flexDirection: props.flexDirection || 'column',
    justifyContent: props.justifyContent || 'flex-start',
    alignItems: props.alignItems || 'center',
  }),
)`
  flex: 1;
  height: 100%;
  background-color: ${props =>
    props.backgroundColor ?? props.theme.colors.background};
  flex-direction: ${props => props.flexDirection};
  justify-content: ${props => props.justifyContent};
  align-items: ${props => props.alignItems};
`;

function LayoutScrollView({
  alignItems = 'center',
  backgroundColor,
  children,
  footer,
  flexDirection = 'column',
  justifyContent = 'flex-start',
  paddingHorizontal,
  paddingVertical,
  useScroll = false,
}: Props) {
  const theme = useTheme();
  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background}
      />
      <StyledSafeArea
        backgroundColor={backgroundColor}
        flexDirection={flexDirection}
        justifyContent={justifyContent}
        alignItems={alignItems}>
        {useScroll && (
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={24}
            style={{ height: '100%', width: '100%', alignSelf: 'stretch' }}
            contentContainerStyle={{
              flexDirection,
              justifyContent,
              alignItems,
              width: '100%',
              // flexGrow (not height: '100%') lets the content grow past the
              // viewport so it can actually scroll when the keyboard shrinks
              // the visible area — a fixed height clips content instead.
              flexGrow: 1,
              alignSelf: 'stretch',
              paddingHorizontal,
              paddingVertical,
            }}
            showsVerticalScrollIndicator={false}>
            {children}
            {/* Inside the scroll content (not sibling to it) so the footer
                scrolls up with the rest of the form when the keyboard opens,
                instead of the keyboard pushing it off screen. marginTop:
                'auto' keeps it pinned to the bottom when content is shorter
                than the viewport. */}
            {React.isValidElement(footer) && (
              <View style={{ width: '100%', marginTop: 'auto' }}>
                {footer}
              </View>
            )}
          </KeyboardAwareScrollView>
        )}
        {!useScroll && children}
      </StyledSafeArea>
    </>
  );
}

export default React.memo(LayoutScrollView);
