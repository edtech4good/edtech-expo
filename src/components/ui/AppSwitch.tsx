import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

export interface AppSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 24;
const THUMB_INSET = 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2; // 20
const ANIM_DURATION = 180;
const ANIM_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AppSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: AppSwitchProps) {
  const theme = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: ANIM_DURATION,
      easing: ANIM_EASING,
    });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: value ? theme.colors.primary : theme.colors.outline,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  const handlePress = () => {
    if (disabled) return;
    onValueChange(!value);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, checked: value }}
      style={[
        {
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        trackStyle,
      ]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: THUMB_INSET,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: theme.colors.onPrimary,
          },
          thumbStyle,
        ]}
      />
    </AnimatedPressable>
  );
}
