import { useFont } from '@/services';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';

import CtaPill from './CtaPill';
import EyebrowText from './EyebrowText';
import LessonStepDots, { LessonStepDotsProps, describeSteps } from './LessonStepDots';
import StatusIcon, { ChevronIcon } from './StatusIcon';

export type LessonRowStatus = 'done' | 'inProgress' | 'todo';

export interface LessonRowProps {
  /** Localized "Lesson N" label for the small chip. */
  chipLabel: string;
  title: string;
  status: LessonRowStatus;
  steps: LessonStepDotsProps['steps'];
  /** Whether this is the up-next lesson: drives the primary border/glow and the CTA pill. */
  isNext: boolean;
  /** "Start" / "Continue" label for the up-next row's CTA pill. Only rendered when `isNext` is true. */
  ctaLabel?: string;
  onPress?: (event: GestureResponderEvent) => void;
  testID?: string;
}

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A lesson row on the corporate Level Detail screen: status icon,
 * "Lesson N" chip, title, and the three Learning/Practice/Quiz step dots.
 * The up-next row gets the design's 2px primary border + glow (driven by
 * `isNext`, independent of `status` — a lesson can be up-next with 0 or
 * partial progress) plus a "Start"/"Continue" CTA pill under the title.
 * Every other row shows a trailing chevron instead. There is no locked
 * state on purpose — the product has no lesson gating today, and a lock
 * that doesn't lock would mislead.
 *
 * F-05: Lesson row status and step states are conveyed via accessibility labels
 * (not color alone). The row's explicit label includes the lesson chip, title,
 * row status, step states, and — for the up-next row — the CTA label, all
 * formatted for screen readers.
 */
export default function LessonRow({
  chipLabel,
  title,
  status,
  steps,
  isNext,
  ctaLabel,
  onPress,
  testID,
}: LessonRowProps) {
  const theme = useTheme();
  const titleFontFamily = useFont('semi', 'body');
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const showCta = isNext && !!ctaLabel;

  // F-05: Build an accessible label combining row status, step states, and
  // (for the up-next row) the CTA label.
  const rowStatusText = t(`screen.level.lessonRowStatus.${status}`);
  const stepsDescription = describeSteps(steps, t);
  const accessibilityLabel = `${chipLabel}, ${title}, ${rowStatusText}, ${stepsDescription}${
    showCta ? `, ${ctaLabel}` : ''
  }`;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
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
      accessible
      accessibilityLabel={accessibilityLabel}
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
      <StatusIcon status={status} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row' }}>
          <View
            style={{
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.lessonChip,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}>
            <EyebrowText
              size={theme.fontSizes.eyebrow}
              color={theme.colors.onPrimary}>
              {chipLabel}
            </EyebrowText>
          </View>
        </View>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: titleFontFamily,
            fontSize: theme.fontSizes.body,
            color: theme.colors.onSurface,
          }}>
          {title}
        </Text>
        {showCta && ctaLabel && (
          <View style={{ marginTop: 2 }}>
            <CtaPill label={ctaLabel} />
          </View>
        )}
      </View>
      <LessonStepDots steps={steps} standalone={false} />
      {!showCta && (
        <ChevronIcon size={20} color={theme.colors.onSurfaceVariant} />
      )}
    </AnimatedPressable>
  );
}
