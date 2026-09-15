import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Runtime connectivity signal that drives the corporate OfflineBanner
 * (src/components/ui/OfflineBanner.tsx, wired via
 * src/components/ui/OfflineBannerFrame.tsx into the learner routes under
 * app/(app)/(home)/).
 *
 * This deliberately reads `isConnected` (link-level) and not
 * `isInternetReachable`. `isConnected` is orthogonal to
 * `EXPO_PUBLIC_ACCESS_TYPE` (src/utils/accessMode.ts, `isOnlineOnly()`) —
 * that flag is a BUILD-TIME deployment mode (the online MIV/DCRS phone app
 * vs. the offline/unset Raspberry-Pi kiosk mode, which reads content from a
 * local Pi over LAN). The Pi kiosk sits on a LAN with the Pi and typically
 * has no path to the internet at all, so a reachability probe
 * (`isInternetReachable`) would report "offline" permanently there even
 * though the LAN link to the Pi is fine. A lost LAN link is still worth
 * reporting, which is exactly what `isConnected` tracks, so this hook is
 * runtime-only and orthogonal to the build-time access-type flag.
 *
 * Unknown (`state.isConnected === null`) is treated as online so the banner
 * does not flash at launch before NetInfo has an answer.
 *
 * On web, netinfo's own listener only fires on `navigator.connection`'s
 * 'change' event when the Network Information API is available
 * (Chromium) — and empirically, Playwright's `context.setOffline(true)`
 * (and some real connectivity transitions) flips `navigator.onLine` and
 * fires the window 'offline'/'online' events without ever firing
 * `connection.change`, so netinfo alone misses it. To cover that gap this
 * hook also listens to the window 'online'/'offline' events itself on web
 * and reads `navigator.onLine` directly. Native platforms are unaffected —
 * they never register these listeners.
 */
export default function useConnectivity(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // netinfo's internal state already fetches on construction, and
    // addEventListener delivers the latest state to a new listener —
    // synchronously if it's already cached, otherwise after that first
    // fetch resolves. That first async delivery isn't cancelled by
    // unsubscribe, so guard it with the cancelled flag too.
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!cancelled) {
        setIsOffline(state.isConnected === false);
      }
    });

    const handleWindowConnectivityChange = () => {
      if (!cancelled) {
        setIsOffline(navigator.onLine === false);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', handleWindowConnectivityChange);
      window.addEventListener('offline', handleWindowConnectivityChange);
    }

    return () => {
      cancelled = true;
      unsubscribe();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', handleWindowConnectivityChange);
        window.removeEventListener('offline', handleWindowConnectivityChange);
      }
    };
  }, []);

  return { isOffline };
}
