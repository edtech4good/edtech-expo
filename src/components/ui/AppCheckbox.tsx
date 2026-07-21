import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

export interface AppCheckboxProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const SIZE = 24;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const ANIM_DURATION = 150;
const ANIM_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const Box = styled.View<{
  $backgroundColor: string;
  $borderColor: string;
  $borderWidth: number;
}>`
  width: ${SIZE}px;
  height: ${SIZE}px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  background-color: ${p => p.$backgroundColor};
  border-width: ${p => p.$borderWidth}px;
  border-color: ${p => p.$borderColor};
`;

export default function AppCheckbox({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: AppCheckboxProps) {
  const theme = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: ANIM_DURATION,
      easing: ANIM_EASING,
    });
  }, [value, progress]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  const handlePress = () => {
    if (disabled) return;
    onValueChange(!value);
  };

  const backgroundColor = disabled
    ? theme.colors.surfaceVariant
    : value
    ? theme.colors.primary
    : theme.colors.surface;

  const borderColor = value ? theme.colors.primary : theme.colors.outline;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, checked: value }}
      style={{ opacity: disabled ? 0.5 : 1 }}>
      <Box
        $backgroundColor={backgroundColor}
        $borderColor={borderColor}
        $borderWidth={1.5}>
        <AnimatedSvg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          style={checkStyle}>
          <Path
            d="M4 12.5L9.5 18L20 6"
            stroke={theme.colors.onPrimary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </AnimatedSvg>
      </Box>
    </Pressable>
  );
}
