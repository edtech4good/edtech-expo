import { Dimensions } from 'react-native';

/**
 * Classifies the physical device as 'phone' or 'tablet' using the
 * rotation-invariant minimum of the screen's two dimensions (the app boots
 * in landscape, so a naive `width` check would misclassify a phone as a
 * tablet at startup). Uses `screen` (the full physical display), not
 * `window` (the app's current layout viewport).
 */
export function getDeviceClass(): 'phone' | 'tablet' {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) < 600 ? 'phone' : 'tablet';
}

/**
 * Device class, distinct from useBreakpoint: device class drives the
 * per-device orientation policy and nav-shell choice (ROADMAP Track B —
 * phones locked portrait, tablets locked landscape), while useBreakpoint
 * drives layout within whatever window results. Device class cannot change
 * at runtime on a physical device, so this is a one-time read with no
 * listener.
 */
export default function useDeviceClass() {
  const deviceClass = getDeviceClass();

  return {
    deviceClass,
    isPhone: deviceClass === 'phone',
    isTablet: deviceClass === 'tablet',
  } as const;
}
