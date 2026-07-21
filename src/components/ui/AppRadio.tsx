import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

export interface AppRadioProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const SIZE = 24;
const OFF_BORDER_WIDTH = 1.5;
const ON_BORDER_WIDTH = 6;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const ANIM_DURATION = 150;
const ANIM_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const AnimatedView = Animated.createAnimatedComponent(Pressable);

export default function AppRadio({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: AppRadioProps) {
  const theme = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: ANIM_DURATION,
      easing: ANIM_EASING,
    });
  }, [value, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderWidth:
      OFF_BORDER_WIDTH +
      progress.value * (ON_BORDER_WIDTH - OFF_BORDER_WIDTH),
    borderColor: value ? theme.colors.selection : theme.colors.outline,
  }));

  const handlePress = () => {
    if (disabled) return;
    onValueChange(!value);
  };

  const backgroundColor = disabled
    ? theme.colors.surfaceVariant
    : theme.colors.onPrimary;

  return (
    <AnimatedView
      onPress={handlePress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: value }}
      style={[
        {
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    />
  );
}
