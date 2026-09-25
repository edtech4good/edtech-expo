import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

export interface ProgressBarProps {
  progress: number;
  variant?: 'default' | 'quiz';
  height?: number;
  testID?: string;
}

export default function ProgressBar({
  progress,
  variant = 'default',
  height,
  testID,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const resolvedHeight = height ?? (variant === 'quiz' ? 4 : 6);
  const fillColor =
    variant === 'quiz' ? theme.colors.primary : theme.colors.success;

  const widthValue = useSharedValue(clamped);

  useEffect(() => {
    widthValue.value = withTiming(clamped, {
      duration: 300,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [clamped, widthValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthValue.value * 100}%`,
  }));

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height: resolvedHeight,
        width: '100%',
        borderRadius: theme.radii.pill,
        // The quiz variant keeps the hairline `divider` track because its blue
        // fill would be ~1.4:1 against the darker `progressTrack` slate.
        backgroundColor:
          variant === 'quiz'
            ? theme.colors.divider
            : theme.colors.progressTrack,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          {
            height: resolvedHeight,
            borderRadius: theme.radii.pill,
            backgroundColor: fillColor,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
