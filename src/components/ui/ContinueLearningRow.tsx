import { useFont } from '@/services';
import { Image, ImageProps } from 'expo-image';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import EyebrowText from './EyebrowText';
import ProgressBar from './ProgressBar';

export interface ContinueLearningRowProps {
  /** Anything expo-image's `source` prop accepts; omit to show the surfaceVariant fallback. */
  imageSource?: ImageProps['source'];
  title: string;
  /** 0–1 */
  progress: number;
  /** e.g. "62% · LESSON 10 OF 16" */
  meta: string;
  onPress?: (event: GestureResponderEvent) => void;
}

const PRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const PRESS_DURATION = 180;
const THUMB_WIDTH = 88;
const THUMB_HEIGHT = 66;
const DISC_SIZE = 28;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PlayIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 4.5v15l14-7.5-14-7.5z"
        fill={color}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ContinueLearningRow({
  imageSource,
  title,
  progress,
  meta,
  onPress,
}: ContinueLearningRowProps) {
  const theme = useTheme();
  const titleFontFamily = useFont('semi', 'body');
  const scale = useSharedValue(1);

  const clampedProgress = Math.min(1, Math.max(0, progress));

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
          numberOfLines={1}
          style={{
            fontFamily: titleFontFamily,
            fontSize: 13,
            color: theme.colors.onSurface,
          }}>
          {title}
        </Text>
        <View style={{ marginTop: 8 }}>
          <ProgressBar progress={clampedProgress} height={5} />
        </View>
        <View style={{ marginTop: 6 }}>
          <EyebrowText size={9} color={theme.colors.onSurfaceVariant}>
            {meta}
          </EyebrowText>
        </View>
      </View>
      <View
        style={{
          width: DISC_SIZE,
          height: DISC_SIZE,
          borderRadius: DISC_SIZE / 2,
          marginLeft: 12,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <PlayIcon color={theme.colors.onPrimary} />
      </View>
    </AnimatedPressable>
  );
}
