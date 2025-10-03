import React from 'react';
import styled, { useTheme } from 'styled-components/native';

import BaseButton, { BaseButtonProps } from './BaseButton';
import { changeColorOpacity, isDisabled } from '../../utils';
import ButtonText from '../texts/ButtonText';
import { ActivityIndicator, StyleProp, TextStyle } from 'react-native';
import { FontFamily } from '@/constants';

interface FilledButtonProps extends BaseButtonProps {
  children?: string;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
  fontFamily?: FontFamily;
}

const Button = styled(BaseButton).attrs((props: BaseButtonProps) => ({
  backgroundColor: props.backgroundColor,
  disabled: props.disabled,
  borderWidth: props.borderWidth,
  borderColor: props.borderColor,
  borderRadius: props.borderRadius,
}))`
  min-height: ${props => props.theme.layouts.defaultComponentSize}px;
  align-self: stretch;
  background-color: ${props =>
    changeColorOpacity(
      props.backgroundColor ?? props.theme.colors.primary,
      isDisabled(props.disabled),
    )};
  padding-horizontal: ${props => props.theme.layouts.pageHorizontalPadding}px;
  padding-vertical: ${props => props.theme.layouts.pageVerticalPadding}px;
  border-color: ${props => props.borderColor ?? 'transparent'};
  border-width: ${props => props.borderWidth ?? 0}px;
`;

export default function FilledButton({
  isLoading = false,
  backgroundColor,
  borderColor,
  borderRadius,
  borderWidth,
  children,
  disabled = false,
  textColor,
  onPress,
  style,
  textStyle,
  fontFamily,
}: FilledButtonProps) {
  const theme = useTheme();
  return (
    <Button
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      borderRadius={borderRadius}
      borderWidth={borderWidth}
      disabled={disabled || isLoading}
      style={style}
      onPress={onPress}>
      {isLoading && <ActivityIndicator color={theme.colors.primaryDark} />}
      {!isLoading && (
        <ButtonText
          color={textColor ?? theme.colors.onPrimary}
          fontFamily={fontFamily}
          style={[
            textStyle,
            {
              // alignSelf: 'stretch',
              textAlignVertical: 'center',
            },
          ]}
          disabled={disabled}>
          {children}
        </ButtonText>
      )}
    </Button>
  );
}
