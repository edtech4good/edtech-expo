import React, { ReactNode, useMemo, useState } from 'react';
import { GestureResponderEvent, Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

export type AppIconButtonVariant = 'plain' | 'filled' | 'surface';

export interface AppIconButtonProps {
  icon: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: AppIconButtonVariant;
  disabled?: boolean;
  size?: number;
  /** Required — icon-only buttons have no visible label. */
  accessibilityLabel: string;
}

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const PRESS_DURATION = 180;
const DEFAULT_SIZE = 44;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ShapeProps {
  $size: number;
  $backgroundColor: string;
  $shadowColor?: string;
}

const Circle = styled(AnimatedPressable)<ShapeProps>`
  width: ${p => p.$size}px;
  height: ${p => p.$size}px;
  border-radius: ${p => p.theme.radii.pill}px;
  align-items: center;
  justify-content: center;
  background-color: ${p => p.$backgroundColor};
  ${p =>
    p.$shadowColor
      ? `shadow-color: ${p.$shadowColor};
         shadow-offset: 0px 4px;
         shadow-opacity: 1;
         shadow-radius: 10px;
         elevation: 3;`
      : ''}
`;

export default function AppIconButton({
  icon,
  onPress,
  variant = 'plain',
  disabled = false,
  size = DEFAULT_SIZE,
  accessibilityLabel,
}: AppIconButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);

  const isInteractive = !disabled;

  const palette = useMemo(() => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: theme.colors.primary,
          pressedBackgroundColor: theme.colors.primaryPressed,
          shadowColor: undefined as string | undefined,
        };
      case 'surface':
        return {
          backgroundColor: theme.colors.surface,
          pressedBackgroundColor: theme.colors.primaryLight,
          shadowColor: theme.colors.shadow,
        };
      case 'plain':
      default:
        return {
          backgroundColor: 'transparent',
          pressedBackgroundColor: theme.colors.primaryLight,
          shadowColor: undefined as string | undefined,
        };
    }
  }, [variant, theme]);

  const backgroundColor = disabled
    ? theme.colors.divider
    : isPressed
    ? palette.pressedBackgroundColor
    : palette.backgroundColor;

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

  return (
    <Circle
      onPress={isInteractive ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isInteractive}
      hitSlop={size < 44 ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !isInteractive }}
      $size={size}
      $backgroundColor={backgroundColor}
      $shadowColor={disabled ? undefined : palette.shadowColor}
      style={animatedStyle}>
      {icon}
    </Circle>
  );
}
