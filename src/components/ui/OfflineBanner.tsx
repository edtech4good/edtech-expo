import { useFont } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import hexAlpha from '@/utils/hexAlpha';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutChangeEvent, Text, View } from 'react-native';
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
  // Reports the banner's current measured height (content + topInset, 0
  // while hidden is NOT reported here — OfflineBannerFrame handles the
  // hidden case itself) so OfflineBannerHeightContext can stay accurate
  // when Khmer copy wraps onto a second line and grows past BANNER_HEIGHT.
  onHeightChange?: (height: number) => void;
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
  onHeightChange,
}: OfflineBannerProps) {
  const theme = useTheme();
  const fontFamily = useFont('semi', 'body');
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  // Khmer floor: never below 13px, line height per the v2.1 type scale's
  // caption role (13/20) — English keeps its own natural (undefined)
  // line height, which is what already produces the one-line 36pt look.
  const fontSize = isKhmer ? 13 : 12;
  const lineHeight = isKhmer ? 20 : undefined;
  const { t } = useTranslation();
  const text = message ?? t('offline.banner');

  // The banner sizes to its content instead of a fixed 36pt: the content
  // row (icon + text, with its own padding/topInset baked in) is measured
  // via onLayout, and the outer Animated.View's height target tracks that
  // measurement so a wrapped two-line Khmer string isn't clipped by
  // `overflow: hidden`. Seed with BANNER_HEIGHT + topInset so the very
  // first (English-shaped) frame renders at the same height as before,
  // before the first onLayout measurement lands.
  const [contentHeight, setContentHeight] = useState(
    () => BANNER_HEIGHT + topInset,
  );
  const totalHeight = contentHeight;

  const height = useSharedValue(visible ? totalHeight : 0);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(visible ? totalHeight : 0, { duration: 200 });
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, height, opacity, totalHeight]);

  useEffect(() => {
    onHeightChange?.(totalHeight);
  }, [totalHeight, onHeightChange]);

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.height);
    setContentHeight(prev => (measured !== prev ? measured : prev));
  };

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
        onLayout={handleContentLayout}
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
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
            fontSize,
            lineHeight,
            color: theme.colors.warningText,
          }}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}
