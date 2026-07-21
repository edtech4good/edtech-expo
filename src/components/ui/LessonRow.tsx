import { useFont } from '@/services';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import EyebrowText from './EyebrowText';
import LessonStepDots, { LessonStepDotsProps } from './LessonStepDots';

export type LessonRowStatus = 'done' | 'next' | 'todo';

export interface LessonRowProps {
  /** Localized "Lesson N" label for the small chip. */
  chipLabel: string;
  title: string;
  status: LessonRowStatus;
  steps: LessonStepDotsProps['steps'];
  onPress?: (event: GestureResponderEvent) => void;
}

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StatusDisc({ status }: { status: LessonRowStatus }) {
  const theme = useTheme();

  const background =
    status === 'done'
      ? theme.colors.success
      : status === 'next'
      ? theme.colors.primary
      : theme.colors.surfaceVariant;

  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {status === 'done' && (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12.5L10 17.5L19 7"
            stroke={theme.colors.onPrimary}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
      {status === 'next' && (
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Polygon points="7,4 21,12 7,20" fill={theme.colors.onPrimary} />
        </Svg>
      )}
      {status === 'todo' && (
        <Svg width={10} height={10} viewBox="0 0 10 10">
          <Circle cx={5} cy={5} r={4} fill={theme.colors.outline} />
        </Svg>
      )}
    </View>
  );
}

/**
 * A lesson row on the corporate Level Detail screen: status disc,
 * "Lesson N" chip, title, and the three Learning/Practice/Quiz step dots.
 * The up-next row gets the design's 2px primary border + glow. There is no
 * locked state on purpose — the product has no lesson gating today, and a
 * lock that doesn't lock would mislead.
 */
export default function LessonRow({
  chipLabel,
  title,
  status,
  steps,
  onPress,
}: LessonRowProps) {
  const theme = useTheme();
  const titleFontFamily = useFont('semi', 'body');
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isNext = status === 'next';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (onPress)
          scale.value = withTiming(0.97, {
            duration: 180,
            easing: PRESS_EASING,
          });
      }}
      onPressOut={() => {
        if (onPress)
          scale.value = withTiming(1, { duration: 180, easing: PRESS_EASING });
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: theme.radii.card,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: isNext ? 2 : 1,
          borderColor: isNext ? theme.colors.primary : theme.colors.divider,
          ...(isNext
            ? {
                shadowColor: theme.shadows.glow,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 1,
                shadowRadius: 20,
                elevation: 4,
              }
            : {}),
        },
        animatedStyle,
      ]}>
      <StatusDisc status={status} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row' }}>
          <View
            style={{
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.lessonChip,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}>
            <EyebrowText size={9} color={theme.colors.onPrimary}>
              {chipLabel}
            </EyebrowText>
          </View>
        </View>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: titleFontFamily,
            fontSize: 13,
            color: theme.colors.onSurface,
          }}>
          {title}
        </Text>
      </View>
      <LessonStepDots steps={steps} />
    </AnimatedPressable>
  );
}
