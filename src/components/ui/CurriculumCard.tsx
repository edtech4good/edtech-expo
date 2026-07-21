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

import Chip from './Chip';
import EyebrowText from './EyebrowText';
import ProgressBar from './ProgressBar';

export interface CurriculumCardProps {
  /** Anything expo-image's `source` prop accepts; omit to show the surfaceVariant fallback. */
  imageSource?: ImageProps['source'];
  /** Omit to skip the category chip — curricula have no category data yet. */
  category?: string;
  title: string;
  /** e.g. "3 GRADES · 12 LEVELS · 38 HOURS"; omit to skip the meta row. */
  meta?: string;
  /** 0–1. When present, shows a progress bar under the meta plus an overlaid "NN%" pill. */
  progress?: number;
  onPress?: (event: GestureResponderEvent) => void;
}

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const PRESS_DURATION = 180;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CurriculumCard({
  imageSource,
  category,
  title,
  meta,
  progress,
  onPress,
}: CurriculumCardProps) {
  const theme = useTheme();
  const titleFontFamily = useFont('semi', 'body');
  const scale = useSharedValue(1);

  const hasProgress = typeof progress === 'number';
  const clampedProgress = hasProgress
    ? Math.min(1, Math.max(0, progress as number))
    : 0;
  const progressLabel = `${Math.round(clampedProgress * 100)}%`;

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
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        {
          borderRadius: theme.radii.card,
          backgroundColor: theme.colors.surface,
          padding: 8,
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
          aspectRatio: 16 / 10,
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
        {hasProgress && (
          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.success,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}>
            <EyebrowText size={9} color={theme.colors.onPrimary}>
              {progressLabel}
            </EyebrowText>
          </View>
        )}
      </View>
      <View style={{ padding: 12 }}>
        {category != null && <Chip label={category} />}
        <Text
          numberOfLines={2}
          style={{
            marginTop: category != null ? 8 : 0,
            fontFamily: titleFontFamily,
            fontSize: 13,
            color: theme.colors.onSurface,
          }}>
          {title}
        </Text>
        {meta != null && (
          <View style={{ marginTop: 6 }}>
            <EyebrowText size={9} color={theme.colors.onSurfaceVariant}>
              {meta}
            </EyebrowText>
          </View>
        )}
        {hasProgress && (
          <View style={{ marginTop: 8 }}>
            <ProgressBar progress={clampedProgress} height={5} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}
