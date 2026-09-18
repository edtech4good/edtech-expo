import { useAppDispatch, useAppSelector } from '@/redux';
import {
  AuthenticationActions,
  getProfile,
  getSelectedLanguage,
} from '@/redux/slices';
import { getAccessToken } from '@/services/secureToken';
import { StartScreen } from '@/screens';
import { useApi, flushPendingResults } from '@/services';
import { Stack } from 'expo-router';
import i18next from 'i18next';
import { useEffect, useState } from 'react';

export default function InitialStack() {
  const api = useApi();
  const dispatch = useAppDispatch();
  // accessToken itself isn't persisted (it lives in SecureStore); profile
  // still comes back from the rehydrated redux-persist state.
  const profile = useAppSelector(getProfile);
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    i18next.changeLanguage(selectedLanguage);
    handleCheckAuth();
  }, []);

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
