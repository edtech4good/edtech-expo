import React, { ReactNode, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { useFont } from '@/services';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'destructive';
export type AppButtonSize = 'lg' | 'md' | 'sm';

export interface AppButtonProps {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Shown instead of `label` while `loading` is true. Omit to show only the spinner. */
  loadingLabel?: string;
  /** Leading icon, hidden while loading. */
  icon?: ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

const HEIGHTS: Record<AppButtonSize, number> = { lg: 52, md: 44, sm: 36 };
const FONT_SIZES: Record<AppButtonSize, number> = { lg: 16, md: 14, sm: 13 };
const HORIZONTAL_PADDING: Record<AppButtonSize, number> = {
  lg: 24,
  md: 20,
  sm: 16,
};
// sm is visually 36pt tall; hitSlop pads it back out to a 44pt hit target.
const SM_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const PRESS_DURATION = 180;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ShapeProps {
  $height: number;
  $paddingHorizontal: number;
  $backgroundColor: string;
  $borderColor: string;
  $borderWidth: number;
  $shadowColor?: string;
  $fullWidth: boolean;
  $opacity: number;
}

const ButtonShape = styled(AnimatedPressable)<ShapeProps>`
  height: ${p => p.$height}px;
  min-width: ${p => p.$height}px;
  padding-horizontal: ${p => p.$paddingHorizontal}px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  align-self: ${p => (p.$fullWidth ? 'stretch' : 'flex-start')};
  border-radius: ${p => p.theme.radii.pill}px;
  background-color: ${p => p.$backgroundColor};
  border-width: ${p => p.$borderWidth}px;
  border-color: ${p => p.$borderColor};
  opacity: ${p => p.$opacity};
  ${p =>
    p.$shadowColor
      ? `shadow-color: ${p.$shadowColor};
         shadow-offset: 0px 8px;
         shadow-opacity: 1;
         shadow-radius: 20px;
         elevation: 6;`
      : ''}
`;

const Label = styled.Text<{
  $color: string;
  $fontFamily: string;
  $fontSize: number;
}>`
  color: ${p => p.$color};
  font-family: ${p => p.$fontFamily};
  font-size: ${p => p.$fontSize}px;
`;

interface Palette {
  backgroundColor: string;
  pressedBackgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
  shadowColor?: string;
}

export default function AppButton({
  variant = 'primary',
  size = 'lg',
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
  icon,
  fullWidth = false,
  accessibilityLabel,
}: AppButtonProps) {
  const theme = useTheme();
  const fontFamily = useFont('semi', 'body');
  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);

  const isInteractive = !disabled && !loading;

  const palette: Palette = useMemo(() => {
    if (disabled) {
      return {
        backgroundColor: theme.colors.divider,
        pressedBackgroundColor: theme.colors.divider,
        borderColor: 'transparent',
        borderWidth: 0,
        textColor: theme.colors.placeholder,
      };
    }
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          pressedBackgroundColor: theme.colors.primaryLight,
          borderColor: theme.colors.primary,
          borderWidth: 1.5,
          textColor: theme.colors.primary,
        };
      case 'tertiary':
        return {
          backgroundColor: 'transparent',
          pressedBackgroundColor: theme.colors.primaryLight,
          borderColor: 'transparent',
          borderWidth: 0,
          textColor: theme.colors.primary,
        };
      case 'destructive':
        return {
          backgroundColor: theme.colors.error,
          pressedBackgroundColor: theme.colors.error,
          borderColor: 'transparent',
          borderWidth: 0,
          textColor: theme.colors.onPrimary,
          shadowColor: `${theme.colors.error}40`,
        };
      case 'primary':
      default:
        return {
          backgroundColor: theme.colors.primary,
          pressedBackgroundColor: theme.colors.primaryPressed,
          borderColor: 'transparent',
          borderWidth: 0,
          textColor: theme.colors.onPrimary,
          shadowColor: theme.shadows.glow,
        };
    }
  }, [variant, disabled, theme]);

  const height = HEIGHTS[size];
  const fontSize = FONT_SIZES[size];
  const paddingHorizontal = HORIZONTAL_PADDING[size];

  const backgroundColor =
    isPressed && isInteractive
      ? palette.pressedBackgroundColor
      : palette.backgroundColor;
  // Destructive has no distinct pressed color token, so it darkens via opacity instead.
  const opacity =
    isPressed && isInteractive && variant === 'destructive' ? 0.9 : 1;
  const shadowColor = isInteractive ? palette.shadowColor : undefined;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isInteractive) return;
    setIsPressed(true);
    scale.value = withTiming(0.97, {
      duration: PRESS_DURATION,
      easing: PRESS_EASING,
    });
  };

  const handlePressOut = () => {
    if (!isInteractive) return;
    setIsPressed(false);
    scale.value = withTiming(1, {
      duration: PRESS_DURATION,
      easing: PRESS_EASING,
    });
  };

  const showLabel = !loading || Boolean(loadingLabel);

  return (
    <ButtonShape
      onPress={isInteractive ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isInteractive}
      hitSlop={size === 'sm' ? SM_HIT_SLOP : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      $height={height}
      $paddingHorizontal={paddingHorizontal}
      $backgroundColor={backgroundColor}
      $borderColor={palette.borderColor}
      $borderWidth={palette.borderWidth}
      $shadowColor={shadowColor}
      $fullWidth={fullWidth}
      $opacity={opacity}
      style={animatedStyle}>
      {loading ? (
        <ActivityIndicator
          color={palette.textColor}
          style={showLabel ? { marginRight: 8 } : undefined}
        />
      ) : (
        icon && <View style={{ marginRight: 8 }}>{icon}</View>
      )}
      {showLabel && (
        <Label
          $color={palette.textColor}
          $fontFamily={fontFamily}
          $fontSize={fontSize}
          numberOfLines={1}>
          {loading ? loadingLabel : label}
        </Label>
      )}
    </ButtonShape>
  );
}
