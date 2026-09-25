import { useFont, useTypeRole } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';

import LessonStepDots, { LessonStepDotsProps, describeSteps } from './LessonStepDots';
import StatusIcon from './StatusIcon';

export type LessonRowStatus = 'done' | 'inProgress' | 'todo';

export interface LessonRowProps {
  /** Localized "Lesson N" label for the small chip. */
  chipLabel: string;
  title: string;
  status: LessonRowStatus;
  steps: LessonStepDotsProps['steps'];
  /** Whether this is the up-next lesson: drives the primary border, the filled
   * up-next status icon, and the "Start"/"Continue" CTA pill. */
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
 * The up-next row gets the design's 2px primary border (no glow/shadow —
 * the handoff reserves the screen's one glow for the footer CTA) plus a
 * "Start"/"Continue" pill on the top line. Every other row shows a plain
 * status word (Done / In progress / Not started) in its place. There is no
 * locked state on purpose — the product has no lesson gating today, and a
 * lock that doesn't lock would mislead.
 *
 * F-05: Lesson row status and step states are conveyed via accessibility labels
 * (not color alone). The row's explicit label includes the lesson chip, title,
 * row status (or the CTA label for the up-next row), and the step states,
 * all formatted for screen readers.
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
  const chipFontFamily = useFont('normal', 'body');
  const statusWordFontFamily = useFont('semi', 'body');
  const ctaFontFamily = useFont('bold', 'body');
  // The row title keeps its own 14px/semi weight (the handoff's "title 600
  // 14", not the larger 'cardTitle' role) but borrows 'body' for a
  // locale-correct line height so Khmer gets the spec's 26px leading.
  const titleLineHeight = useTypeRole('body').lineHeight;
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  // Chip/CTA/status micro-labels: Khmer floor — never below 13px.
  const microFontSize = isKhmer ? 13 : 12;
  const microLineHeight = isKhmer ? 20 : undefined;
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const showCta = isNext && !!ctaLabel;

  const rowStatusText = t(`screen.level.lessonRowStatus.${status}`);
  const stepsDescription = describeSteps(steps, t);
  // F-05: the up-next row's a11y label carries the CTA label in place of
  // (not in addition to) the plain status word, mirroring what's on screen.
  const statusOrCtaText = showCta && ctaLabel ? ctaLabel : rowStatusText;
  const accessibilityLabel = `${chipLabel}, ${title}, ${statusOrCtaText}, ${stepsDescription}`;

  const statusWordColor =
    status === 'done'
      ? theme.colors.successText
      : status === 'inProgress'
      ? theme.colors.primary
      : theme.colors.onSurfaceVariant;

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
      // TODO(native review): km "មេរៀនបន្ទាប់" replaces the more literal
      // "បន្ទាប់", which was retired because it clashes with the quiz
      // screen's "Next" button — flagged for a native speaker to confirm
      // this reads naturally as an a11y hint, not just as a label.
      accessibilityHint={isNext ? t('screen.level.upNextHint') : undefined}
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
          // No glow/shadow on any row — the handoff's one screen glow is
          // reserved for the footer CTA.
        },
        animatedStyle,
      ]}>
      <StatusIcon status={isNext ? 'upNext' : status} />
      <View style={{ flex: 1, gap: 5 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
          <View
            style={{
              minHeight: 24,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.lessonChip,
              paddingHorizontal: 10,
              paddingVertical: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                fontFamily: chipFontFamily,
                fontSize: microFontSize,
                lineHeight: microLineHeight,
                color: theme.colors.onPrimary,
              }}>
              {chipLabel}
            </Text>
          </View>
          {showCta && ctaLabel ? (
            <View
              testID="cta-pill"
              style={{
                minHeight: 28,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.primaryLight,
                paddingHorizontal: 12,
                paddingVertical: 3,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  fontFamily: ctaFontFamily,
                  fontSize: microFontSize,
                  lineHeight: microLineHeight,
                  color: theme.colors.primaryDark,
                }}>
                {ctaLabel}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontFamily: statusWordFontFamily,
                fontSize: microFontSize,
                lineHeight: microLineHeight,
                color: statusWordColor,
              }}>
              {rowStatusText}
            </Text>
          )}
        </View>
        <Text
          style={{
            fontFamily: titleFontFamily,
            fontSize: theme.fontSizes.body,
            lineHeight: titleLineHeight,
            color: theme.colors.onSurface,
          }}>
          {title}
        </Text>
        <LessonStepDots steps={steps} standalone={false} />
      </View>
    </AnimatedPressable>
  );
}
