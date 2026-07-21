import { useFont } from '@/services';
import hexAlpha from '@/utils/hexAlpha';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

export interface OfflineBannerProps {
  visible: boolean;
  message?: string;
}

// No existing i18n key for "you are offline" in src/locales/en.json or
// km.json (checked screen.* and top-level namespaces) — using the literal
// from the spec rather than inventing a new translation key.
const DEFAULT_MESSAGE =
  'You are offline. Downloaded lessons are still available.';

const BANNER_HEIGHT = 36;

function WarningTriangleIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.5l9 15.5H3l9-15.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 10v4.5M12 17.5v.01"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function OfflineBanner({
  visible,
  message = DEFAULT_MESSAGE,
}: OfflineBannerProps) {
  const theme = useTheme();
  const fontFamily = useFont('semi', 'body');

  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    height.value = withTiming(visible ? BANNER_HEIGHT : 0, { duration: 200 });
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, height, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ width: '100%', overflow: 'hidden' }, animatedStyle]}>
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          minHeight: BANNER_HEIGHT,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: hexAlpha(theme.colors.warning, 0.18),
        }}>
        <WarningTriangleIcon color={theme.colors.warningText} />
        <Text
          style={{
            flex: 1,
            marginLeft: 8,
            fontFamily,
            fontSize: 12,
            color: theme.colors.warningText,
          }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
