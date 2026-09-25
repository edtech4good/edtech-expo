import {
  OfflineBannerHeightContext,
  useConnectivity,
  useDesign,
} from '@/services';
import { ReactNode, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OfflineBanner, { BANNER_HEIGHT } from './OfflineBanner';

/**
 * Wraps a learner route's screen so the OfflineBanner sits pinned directly
 * under that screen's navigation header (handoff: "Offline warning banner
 * (amber tint) pinned under the bar").
 *
 * This is rendered per route rather than once in the shell
 * (app/(app)/(home)/_layout.tsx) because on Android the native-stack header
 * owns the status-bar inset: anything placed above the header lands under
 * the translucent status bar and the header still pads for its own inset,
 * leaving a blank gap. Rendering inside each route, below its header,
 * avoids both problems.
 *
 * The kids theme renders no banner at all here — not hidden, not mounted —
 * which the Playwright spec asserts via a testID count of 0.
 *
 * Pass `safeAreaTop` for a route whose screen sets `headerShown: false`
 * (there is no native-stack header to own the status-bar inset, so the
 * banner would otherwise sit at y=0 under it) — e.g.
 * app/(app)/(home)/home/lessons/[id].tsx (LessonScreen). It adds the
 * device's safe-area top inset on top of the banner's own height.
 *
 * OfflineBannerHeightContext publishes how much vertical space the visible
 * banner actually occupies (0 when hidden) so fixed-height layouts that pin
 * themselves to the window — Container.tsx, useScreenDimension.ts — can
 * subtract it, the same way they already subtract the bottom tab bar
 * height, instead of clipping content/footers underneath the banner.
 *
 * The banner now sizes to its content (OfflineBanner measures itself via
 * onLayout, e.g. when Khmer copy wraps onto a second line), so the height
 * published here tracks OfflineBanner's own `onHeightChange` measurement
 * rather than the constant BANNER_HEIGHT.
 */
export default function OfflineBannerFrame({
  children,
  safeAreaTop = false,
}: {
  children: ReactNode;
  safeAreaTop?: boolean;
}) {
  const { isCorporate } = useDesign();
  const { isOffline } = useConnectivity();
  const insets = useSafeAreaInsets();
  const topInset = safeAreaTop ? insets.top : 0;
  const [measuredHeight, setMeasuredHeight] = useState(
    () => BANNER_HEIGHT + topInset,
  );
  const bannerHeight = isCorporate && isOffline ? measuredHeight : 0;

  return (
    <View style={{ flex: 1 }}>
      {isCorporate ? (
        <OfflineBanner
          visible={isOffline}
          topInset={topInset}
          onHeightChange={setMeasuredHeight}
        />
      ) : null}
      <OfflineBannerHeightContext.Provider value={bannerHeight}>
        {children}
      </OfflineBannerHeightContext.Provider>
    </View>
  );
}
