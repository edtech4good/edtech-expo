import { useFont } from '@/services';
import { Image, ImageProps } from 'expo-image';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import CtaPill from './CtaPill';
import EyebrowText from './EyebrowText';
import StatusIcon, { StatusIconStatus } from './StatusIcon';

export type LessonStepRowType = 'learning' | 'practice' | 'quiz';
export type LessonStepRowStatus = 'done' | 'inProgress' | 'todo';

export interface LessonStepRowProps {
  type: LessonStepRowType;
  /** Pre-composed eyebrow text, e.g. "LEARNING" or "PRACTICE · 1 OF 2" — i18n happens in the caller. */
  eyebrow: string;
  /** Pre-composed title, e.g. "Fixture basics" or "8 questions · unscored". */
  title: string;
  /** Pre-composed status line, e.g. "Done", "In progress", "Not started", "Done · saved on device, not synced". */
  statusText: string;
  status: LessonStepRowStatus;
  /** Whether this is the lesson's one next-step row: 2px primary border, CTA pill instead of the plain status icon. */
  isNext: boolean;
  /** "Start" / "Continue" — only rendered when isNext. */
  ctaLabel?: string;
  /** Practice/quiz done-but-not-yet-synced: amber upload badge on the status icon, warning-colored status text. Never true for learnings. */
  unsynced?: boolean;
  /** Learning only: 72x54 thumbnail with a play-disc overlay. */
  imageSource?: ImageProps['source'];
  onPress?: (event: GestureResponderEvent) => void;
  /** "<Type> <i> of <n>, <title>, <status text>" — composed by the caller so it can add the "up next" hint. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Sizes per the v2.1 multi-item mock (newer than README §3b).
const THUMB_WIDTH = 72;
const THUMB_HEIGHT = 54;
const WELL_SIZE = 48;
const STATUS_DISC_SIZE = 24;

function PlayDiscOverlay() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          backgroundColor: 'rgba(9,16,29,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Svg width={10} height={10} viewBox="0 0 20 20" fill="none">
          <Path d="M5 3l12 7-12 7V3z" fill="#FFFFFF" />
        </Svg>
      </View>
    </View>
  );
}

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4L19 9l-4-4L4 16v4z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M13.5 6.5l4 4" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function ClipboardCheckIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={4}
        width={14}
        height={17}
        rx={2}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M9 4V3h6v1M9 13l2 2 4-4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloudUploadIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9H7z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M12 15V11m-2 2 2-2 2 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 18px amber upload badge on the bottom-right of the done disc (v2.1: saved offline, not synced). */
function UnsyncedBadge({ testID }: { testID?: string }) {
  const theme = useTheme();
  return (
    <View
      testID={testID ?? 'unsynced-badge'}
      style={{
        position: 'absolute',
        right: -5,
        bottom: -5,
        width: 18,
        height: 18,
        borderRadius: 999,
        backgroundColor: theme.colors.warning,
        borderWidth: 2,
        borderColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={9} height={9} viewBox="0 0 10 10" fill="none">
        <Path
          d="M5 8.5V2M2.2 4.6 5 1.8l2.8 2.8"
          stroke={theme.colors.warningText}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/**
 * One step in the "In this lesson" list (Lesson screen, v2.1 §3b): a
 * learning (video thumbnail), practice or quiz row. The next step in
 * hierarchy order (learnings, then practices, then quizzes) gets the 2px
 * primary border and a Start/Continue CTA pill in place of its status icon —
 * this screen's only glow-free "you are here" marker; every other row shows
 * a plain StatusIcon. A done-but-not-yet-synced practice/quiz (offline
 * queue) gets an amber upload badge on its status icon and amber status
 * text instead of the usual green/blue/grey.
 */
export default function LessonStepRow({
  type,
  eyebrow,
  title,
  statusText,
  status,
  isNext,
  ctaLabel,
  unsynced,
  imageSource,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: LessonStepRowProps) {
  const theme = useTheme();
  const titleFontFamily = useFont('semi', 'body');
  const statusFontFamily = useFont('semi', 'body');
  const scale = useSharedValue(1);

  const showCta = isNext && !!ctaLabel;
  const statusIconStatus: StatusIconStatus = status;

  const statusColor = unsynced && status === 'done'
    ? theme.colors.warningText
    : status === 'done'
    ? theme.colors.successText
    : status === 'inProgress'
    ? theme.colors.primary
    : theme.colors.onSurfaceVariant;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const wellTinted = isNext && (type === 'practice' || type === 'quiz');
  const wellIconColor = wellTinted
    ? theme.colors.primary
    : theme.colors.onSurfaceVariant;

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
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: theme.radii.card,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: isNext ? 2 : 1,
          borderColor: isNext ? theme.colors.primary : theme.colors.divider,
          // v2 decision: one glow per screen, reserved for the footer CTA —
          // no shadow/glow on any step row, next or otherwise.
        },
        animatedStyle,
      ]}>
      {type === 'learning' ? (
        <View
          style={{
            width: THUMB_WIDTH,
            height: THUMB_HEIGHT,
            borderRadius: theme.radii.imageWell,
            overflow: 'hidden',
            backgroundColor: theme.colors.surfaceVariant,
            flexShrink: 0,
          }}>
          {imageSource && (
            <Image
              source={imageSource}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          )}
          <PlayDiscOverlay />
        </View>
      ) : (
        <View
          style={{
            width: WELL_SIZE,
            height: WELL_SIZE,
            borderRadius: theme.radii.media,
            backgroundColor: wellTinted
              ? theme.colors.primaryLight
              : theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          {type === 'practice' ? (
            <PencilIcon color={wellIconColor} />
          ) : (
            <ClipboardCheckIcon color={wellIconColor} />
          )}
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <EyebrowText size={12}>{eyebrow}</EyebrowText>
        <Text
          style={{
            fontFamily: titleFontFamily,
            fontSize: 14,
            lineHeight: 20,
            color: theme.colors.onSurface,
          }}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {unsynced && status === 'done' && (
            <CloudUploadIcon color={theme.colors.warningText} />
          )}
          <Text
            style={{
              fontFamily: statusFontFamily,
              fontSize: 12,
              color: statusColor,
            }}>
            {statusText}
          </Text>
        </View>
      </View>
      {showCta && ctaLabel ? (
        <CtaPill label={ctaLabel} variant="tint" />
      ) : (
        <View
          style={{
            position: 'relative',
            width: STATUS_DISC_SIZE,
            height: STATUS_DISC_SIZE,
          }}>
          <StatusIcon
            status={statusIconStatus}
            size={STATUS_DISC_SIZE}
            testID={`status-icon-${status}`}
          />
          {unsynced && status === 'done' && <UnsyncedBadge />}
        </View>
      )}
    </AnimatedPressable>
  );
}
