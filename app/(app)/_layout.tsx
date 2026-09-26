import { useAppDispatch, useAppSelector } from '@/redux';
import {
  AuthenticationActions,
  getPendingResults,
  getProfile,
  getSelectedLanguage,
} from '@/redux/slices';
import { getAccessToken } from '@/services/secureToken';
import { StartScreen } from '@/screens';
import { useApi, flushPendingResults } from '@/services';
import { reconnectFlushAction } from '@/services/pendingResultsQueue';
import NetInfo from '@react-native-community/netinfo';
import { Stack } from 'expo-router';
import i18next from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Wait for a reconnect to settle before flushing: links flap (captive
// portals, a Wi-Fi hand-off); going offline again cancels the wait.
const RECONNECT_FLUSH_DELAY_MS = 2000;

export default function InitialStack() {
  const api = useApi();
  const dispatch = useAppDispatch();
  // accessToken itself isn't persisted (it lives in SecureStore); profile
  // still comes back from the rehydrated redux-persist state.
  const profile = useAppSelector(getProfile);
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const [isReady, setIsReady] = useState(false);
  // Read inside the long-lived connectivity listener below, so it sees the
  // current login state rather than the one it closed over at mount.
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const pendingCountRef = useRef(0);
  pendingCountRef.current = useAppSelector(getPendingResults).length;

  useEffect(() => {
    i18next.changeLanguage(selectedLanguage);
    handleCheckAuth();
  }, []);

  // Flush the offline queue (practice/quiz results, video progress) when the
  // device comes back online — otherwise it waits for the next app start or
  // the next submit. Any online report (unknown/null counts as online, as in
  // useConnectivity) schedules one debounced flush while something is
  // queued; an offline report cancels it. See reconnectFlushAction for why
  // this keeps no "previous state": on web a stale netinfo event used to
  // mask the real reconnect. Flushes only when someone is logged in. No
  // concurrency guard of its own: flushPendingResults serialises on
  // flushChain, so an overlap with the start-up or a submit flush just
  // queues behind it. Web also listens to window 'online', which netinfo
  // misses in some transitions — same pattern as useConnectivity.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onConnectivity = (isConnected: boolean | null) => {
      if (cancelled) return;
      const action = reconnectFlushAction({
        isConnected,
        flushScheduled: timer !== undefined,
        hasPendingItems: pendingCountRef.current > 0,
      });
      if (action === 'cancel') {
        clearTimeout(timer);
        timer = undefined;
        return;
      }
      if (action !== 'schedule') return;
      timer = setTimeout(() => {
        timer = undefined;
        if (cancelled || !profileRef.current) return;
        flushPendingResults(api).catch(() => {});
      }, RECONNECT_FLUSH_DELAY_MS);
    };

    const unsubscribe = NetInfo.addEventListener(state => {
      onConnectivity(state.isConnected);
    });

    const handleWindowConnectivityChange = () => {
      onConnectivity(navigator.onLine);
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', handleWindowConnectivityChange);
      window.addEventListener('offline', handleWindowConnectivityChange);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', handleWindowConnectivityChange);
        window.removeEventListener('offline', handleWindowConnectivityChange);
      }
    };
  }, [api]);

  // getAccessToken() itself never rejects (secureToken.ts catches and
  // returns null), but the finally is kept as a hard guarantee: nothing
  // below this effect can leave the app stuck behind StartScreen forever.
  //
  // Why the dispatch below is safe against a late REHYDRATE clobbering it:
  // this component sits under <PersistGate persistor={persistor}> (see
  // app/_layout.tsx) with no `loading` prop, and PersistGate renders
  // nothing under its subtree until `bootstrapped` — which redux-persist
  // only sets after REHYDRATE runs. So this effect, and the `profile`
  // value it closes over, always run strictly after rehydration; there is
  // no ordering in which persist/REHYDRATE arrives afterward and replaces
  // state.authentication out from under this dispatch. That invariant
  // depends on PersistGate staying in place with no `loading` prop and on
  // the default autoMergeLevel1 reconciler — do not remove either without
  // re-checking this.
  const handleCheckAuth = async () => {
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        dispatch(
          AuthenticationActions.updateAccessToken({ accessToken, profile }),
        );
        await api.setHeaders({ authorization: `Bearer ${accessToken}` });
        flushPendingResults(api);
      }
    } finally {
      setIsReady(true);
    }
  };

  if (isReady === false) return <StartScreen />;
  // if (isReady && !accessToken)
  //   return <Redirect href="/login?isLoggedOut=true" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(home)" />
      <Stack.Screen name="teacher" />
    </Stack>
  );
}
