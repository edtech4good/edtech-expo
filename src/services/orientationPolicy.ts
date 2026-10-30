/**
 * The orientation policy as plain data, kept free of native modules so it can
 * be unit-tested under node (see __tests__/orientationPolicy.ts) and read by
 * useOrientationPolicy, which maps it onto expo-screen-orientation locks.
 *
 *  - tablets stay landscape, always (the lesson video included);
 *  - phones stay portrait, except while the lesson video is full screen, when
 *    they may turn to landscape ('any').
 */
export type DeviceClass = 'phone' | 'tablet';
export type OrientationPolicy = 'portrait' | 'landscape' | 'any';
export type OrientationKind = 'portrait' | 'landscape' | 'unknown';

export function orientationPolicyFor(
  deviceClass: DeviceClass,
  videoFullScreen: boolean,
): OrientationPolicy {
  if (deviceClass === 'tablet') return 'landscape';
  return videoFullScreen ? 'any' : 'portrait';
}

/**
 * True when the reported orientation breaks the policy and the lock must be
 * re-applied. 'unknown' (Android has no window/display to read) is compliant.
 */
export function contradictsPolicy(
  policy: OrientationPolicy,
  orientation: OrientationKind,
): boolean {
  if (policy === 'any' || orientation === 'unknown') return false;
  return policy !== orientation;
}
