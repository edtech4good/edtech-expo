import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import {
  contradictsPolicy,
  orientationPolicyFor,
  OrientationKind,
  OrientationPolicy,
} from '../orientationPolicy';
import { useVideoFullScreen } from '../videoFullScreen';
import { getDeviceClass } from './useDeviceClass';

const LOCKS: Record<OrientationPolicy, ScreenOrientation.OrientationLock> = {
  portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  landscape: ScreenOrientation.OrientationLock.LANDSCAPE,
  any: ScreenOrientation.OrientationLock.ALL,
};

function kindOf(orientation: ScreenOrientation.Orientation): OrientationKind {
  if (
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
    orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  )
    return 'landscape';
  if (
    orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
    orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
  )
    return 'portrait';
  return 'unknown';
}

/**
 * Per-device orientation policy (ROADMAP Track B): phones locked
 * PORTRAIT_UP, tablets locked LANDSCAPE. The one exception is the lesson
 * video's full screen (edtech-expo#143): while it is open a phone may turn to
 * landscape (lock ALL), and the portrait lock is re-applied the moment it
 * closes. The exception lives here, in the policy the listener below
 * enforces, because a listener that re-locks portrait whenever the phone
 * turns would undo any rotation the lesson screen allowed. The flag is
 * videoFullScreen.ts; a JS reload resets it to false, so a reload always
 * lands back on the portrait lock.
 *
 * Why this needs a listener, not just a one-shot lock on mount: app.json's
 * "orientation": "landscape" is applied to the Activity by Expo Go / the
 * manifest before our JS runs. Expo Go's ScreenOrientation module restores
 * that initial (manifest) orientation asynchronously when a JS instance is
 * destroyed (reload / fast refresh / kernel reload), via
 * onCatalystInstanceDestroy. That restore can land AFTER the next JS
 * instance has already called lockAsync, leaving a phone stuck in
 * landscape even though our lock "succeeded" at mount time. Observed 15 Sep
 * 2026 on a Pixel 7 API 33 running Expo Go 2.30.11: the Activity's
 * orientation history was LANDSCAPE -> PORTRAIT -> LANDSCAPE for a single
 * reload.
 *
 * The fix keeps the immediate lock on mount (so a phone doesn't sit on a
 * landscape splash while fonts/i18n load); re-checks the lock at 1s, 3s
 * and 8s via getOrientationLockAsync and re-applies it if it differs
 * (this covers a restore landing after our lock without producing a
 * dimension change); and subscribes to orientation-change events for the
 * lifetime of the root component, re-applying the lock whenever the
 * reported lock or orientation contradicts the policy. After a re-lock,
 * the next event is compliant, so this settles rather than looping.
 * Proved on the emulator by injecting a late lockAsync(LANDSCAPE_RIGHT)
 * (the platform value Expo Go restores): with the listener the lock was
 * re-asserted within ~300 ms; with it disabled the phone stayed
 * landscape; with it disabled and the injection at 2s the settle check
 * recovered it by 8s.
 *
 * Note getDeviceClass() is rotation-invariant (it uses the minimum of the
 * screen's two dimensions), so the transient landscape reading at boot does
 * not misclassify a phone as a tablet — classification is not the bug here.
 */
export default function useOrientationPolicy(): void {
  const videoFullScreen = useVideoFullScreen();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    const deviceClass = getDeviceClass();
    const policy = orientationPolicyFor(deviceClass, videoFullScreen);
    const desiredLock = LOCKS[policy];

    const apply = () => {
      ScreenOrientation.lockAsync(desiredLock).catch(() => {
        // Some platforms/devices reject the lock; never block boot on it.
      });
    };

    apply();

    // Bounded settle checks: these cover the window right after a reload
    // where Expo Go's restore of the manifest orientation can land after
    // our lock without producing a dimension change, so no
    // orientation-change event would otherwise fire.
    const settleTimeouts = [1000, 3000, 8000].map(delay =>
      setTimeout(() => {
        ScreenOrientation.getOrientationLockAsync()
          .then(lock => {
            if (!cancelled && lock !== desiredLock) apply();
          })
          // An unreadable lock is not the desired lock; re-applying is idempotent.
          .catch(() => {
            if (!cancelled) apply();
          });
      }, delay),
    );

    const subscription = ScreenOrientation.addOrientationChangeListener(
      ({ orientationInfo, orientationLock }) => {
        if (cancelled) return;

        if (orientationLock !== desiredLock) {
          apply();
          return;
        }

        if (contradictsPolicy(policy, kindOf(orientationInfo.orientation)))
          apply();
        // UNKNOWN only appears when Android has no window/display to read; treat it as compliant.
      },
    );

    return () => {
      cancelled = true;
      settleTimeouts.forEach(clearTimeout);
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [videoFullScreen]);
}
