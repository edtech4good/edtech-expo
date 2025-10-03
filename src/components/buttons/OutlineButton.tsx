import React from 'react';
import styled, { useTheme } from 'styled-components/native';

import BaseButton, { BaseButtonProps } from './BaseButton';
import { changeColorOpacity, isDisabled } from '../../utils';
import ButtonText from '../texts/ButtonText';
import { StyleProp, TextStyle } from 'react-native';

interface OutlineButtonProps extends BaseButtonProps {
  children?: string;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
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
  background-color: ${props => props.theme.colors.surface};
  padding-horizontal: ${props => props.theme.layouts.pageHorizontalPadding}px;
  padding-vertical: ${props => props.theme.layouts.pageVerticalPadding}px;
  border-color: ${props => props.borderColor ?? props.theme.colors.primary};
  border-width: ${props => props.borderWidth ?? 3}px;
`;

export default function OutlineButton({
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
}: OutlineButtonProps) {
  const theme = useTheme();
  return (
    <Button
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      borderRadius={borderRadius}
      borderWidth={borderWidth}
      disabled={disabled}
      style={style}
      onPress={onPress}>
      <ButtonText
        color={textColor ?? theme.colors.primary}
        style={textStyle}
        disabled={disabled}>
        {children}
      </ButtonText>
    </Button>
  );
}
