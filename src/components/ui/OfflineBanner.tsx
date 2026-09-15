import { useFont } from '@/services';
import hexAlpha from '@/utils/hexAlpha';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  // Extra top inset (e.g. a safe-area top inset) the banner should cover in
  // addition to its own height, for routes that render it at y=0 under a
  // translucent status bar (see OfflineBannerFrame's safeAreaTop prop).
  topInset?: number;
}

// Default copy comes from the offline.banner i18n key (src/locales/en.json
// / km.json). Exported so OfflineBannerFrame and fixed-height layouts
// (Container.tsx, useScreenDimension.ts, via OfflineBannerHeightContext)
// can size around the banner without duplicating this constant.
export const BANNER_HEIGHT = 36;

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
  message,
  topInset = 0,
}: OfflineBannerProps) {
  const theme = useTheme();
  const fontFamily = useFont('semi', 'body');
  const { t } = useTranslation();
  const text = message ?? t('offline.banner');
  const totalHeight = BANNER_HEIGHT + topInset;

  const height = useSharedValue(visible ? totalHeight : 0);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(visible ? totalHeight : 0, { duration: 200 });
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, height, opacity, totalHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID="offline-banner"
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[{ width: '100%', overflow: 'hidden' }, animatedStyle]}>
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          minHeight: totalHeight,
          paddingTop: 10 + topInset,
          paddingBottom: 10,
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
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}
