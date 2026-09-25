import { useAppDispatch, useAppSelector } from '@/redux';
import {
  AuthenticationActions,
  getProfile,
  getSelectedLanguage,
} from '@/redux/slices';
import { getAccessToken } from '@/services/secureToken';
import { StartScreen } from '@/screens';
import { useApi, flushPendingResults } from '@/services';
import NetInfo from '@react-native-community/netinfo';
import { Stack } from 'expo-router';
import i18next from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Wait for a reconnect to settle before flushing: links flap (captive
// portals, a Wi-Fi hand-off), and each event restarts the wait.
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
  // Last connectivity seen by the reconnect listener; unknown counts as
  // online, so a launch while online never triggers a reconnect flush (the
  // start-up flush in handleCheckAuth covers that).
  const wasConnectedRef = useRef(true);

  useEffect(() => {
    i18next.changeLanguage(selectedLanguage);
    handleCheckAuth();
  }, []);

  // Flush the offline queue (practice/quiz results, video progress) when the
  // device comes back online — otherwise it waits for the next app start or
  // the next submit. Acts only on an offline -> online transition (the
  // previous state is kept in a ref; unknown/null counts as online, as in
  // useConnectivity), only when someone is logged in, and debounced. No
  // concurrency guard of its own: flushPendingResults serialises on
  // flushChain, so an overlap with the start-up or a submit flush just
  // queues behind it. Web also listens to window 'online', which netinfo
  // misses in some transitions — same pattern as useConnectivity.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onConnectivity = (isConnected: boolean) => {
      if (cancelled) return;
      const previous = wasConnectedRef.current;
      wasConnectedRef.current = isConnected;
      // Going offline cancels a pending flush; each offline -> online
      // transition restarts the wait. An online -> online event must NOT
      // clear it: on web, netinfo and window 'online' both report the same
      // reconnect, and the second would otherwise cancel the first's flush.
      if (!isConnected) {
        if (timer) clearTimeout(timer);
        timer = undefined;
        return;
      }
      if (previous) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        if (cancelled || !profileRef.current) return;
        flushPendingResults(api).catch(() => {});
      }, RECONNECT_FLUSH_DELAY_MS);
    };

    const unsubscribe = NetInfo.addEventListener(state => {
      onConnectivity(state.isConnected !== false);
    });

    const handleWindowConnectivityChange = () => {
      onConnectivity(navigator.onLine !== false);
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
