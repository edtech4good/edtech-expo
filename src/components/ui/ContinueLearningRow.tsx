import { useFont } from '@/services';
import { Image, ImageProps } from 'expo-image';
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
import ProgressBar from './ProgressBar';
import StatusIcon, { ChevronIcon, StatusIconStatus } from './StatusIcon';

export interface ContinueLearningRowTrailing {
  /** Status icon to show before the chevron. Omit when there's no per-item status data. */
  status?: StatusIconStatus;
  /** When set, replaces the status icon + chevron with a "Start"/"Continue" pill. */
  ctaLabel?: string;
}

export interface ContinueLearningRowProps {
  /** Anything expo-image's `source` prop accepts; omit to show the surfaceVariant fallback. */
  imageSource?: ImageProps['source'];
  title: string;
  /** 0–1; omit to skip the progress bar (e.g. items with no per-item progress data). */
  progress?: number;
  /** e.g. "62% · LESSON 10 OF 16"; omit to skip the meta row. */
  meta?: string;
  /** Trailing affordance: a CTA pill, a status icon + chevron, or (default) just a chevron. */
  trailing?: ContinueLearningRowTrailing;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  testID?: string;
}

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const PRESS_DURATION = 180;
const THUMB_WIDTH = 88;
const THUMB_HEIGHT = 66;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ContinueLearningRow({
  imageSource,
  title,
  progress,
  meta,
  trailing,
  onPress,
  accessibilityLabel,
  testID,
}: ContinueLearningRowProps) {
  const theme = useTheme();
  const titleFontFamily = useFont('semi', 'body');
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  // Status and CTA are conveyed visually via StatusIcon/CtaPill, both hidden
  // from screen readers — fold them into the row's accessible label so status
  // is never conveyed by colour alone. An explicit accessibilityLabel prop
  // still wins.
  const defaultAccessibilityLabel = [
    title,
    meta,
    trailing?.status &&
      t(`screen.level.lessonRowStatus.${trailing.status}`),
    trailing?.ctaLabel,
  ]
    .filter(Boolean)
    .join(', ');

  const hasProgress = typeof progress === 'number';
  const clampedProgress = hasProgress
    ? Math.min(1, Math.max(0, progress as number))
    : 0;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withTiming(0.97, {
      duration: PRESS_DURATION,
      easing: PRESS_EASING,
    });
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withTiming(1, {
      duration: PRESS_DURATION,
      easing: PRESS_EASING,
    });
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? defaultAccessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: theme.radii.card,
          backgroundColor: theme.colors.surface,
          padding: 10,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 16,
          elevation: 3,
        },
        animatedStyle,
      ]}>
      <View
        style={{
          width: THUMB_WIDTH,
          height: THUMB_HEIGHT,
          borderRadius: theme.radii.imageWell,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceVariant,
        }}>
        {imageSource && (
          <Image
            source={imageSource}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            fontFamily: titleFontFamily,
            fontSize: 13,
            lineHeight: 20,
            color: theme.colors.onSurface,
          }}>
          {title}
        </Text>
        {hasProgress && (
          <View style={{ marginTop: 8 }}>
            <ProgressBar progress={clampedProgress} height={5} />
          </View>
        )}
        {meta != null && (
          <View style={{ marginTop: 6 }}>
            <EyebrowText size={9} color={theme.colors.onSurfaceVariant}>
              {meta}
            </EyebrowText>
          </View>
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginLeft: 12,
        }}>
        {trailing?.ctaLabel ? (
          <CtaPill label={trailing.ctaLabel} />
        ) : (
          <>
            {trailing?.status && <StatusIcon status={trailing.status} size={24} />}
            <ChevronIcon size={20} color={theme.colors.onSurfaceVariant} />
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}
