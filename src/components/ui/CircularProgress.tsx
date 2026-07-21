import { useFont } from '@/services';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

export interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CircularProgress({
  progress,
  size = 64,
  strokeWidth = 6,
  label,
}: CircularProgressProps) {
  const theme = useTheme();
  const fontFamily = useFont('bold', 'display');
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progressValue = useSharedValue(clamped);

  useEffect(() => {
    progressValue.value = withTiming(clamped, {
      duration: 300,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [clamped, progressValue]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progressValue.value),
  }));

  const resolvedLabel = label ?? `${Math.round(clamped * 100)}%`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={animatedProps}
          // Rotate so the arc starts at 12 o'clock instead of svg's 3 o'clock.
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          position: 'absolute',
          fontFamily,
          fontSize: size * 0.28,
          color: theme.colors.onBackground,
        }}>
        {resolvedLabel}
      </Text>
    </View>
  );
}
