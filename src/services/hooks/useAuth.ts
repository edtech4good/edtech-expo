import { clearAllData, useAppDispatch, useAppSelector } from '@/redux';
import { useApi } from '../api/ApiContext';
import { useState } from 'react';
import {
  EdtechLoginPayload,
  LmsLoginPayload,
  LoginPayload,
  Profile,
} from '@/models';
import {
  AuthenticationActions,
  getProfile,
  SettingActions,
} from '@/redux/slices';
import { router } from 'expo-router';
import { Decoder } from '@/utils';
import _ from 'lodash';
import { toAuthPayload } from '@/transforms';
import useSyncContent from './useSyncContent';
import { isDevPillTouched } from '@/services/devThemeOverride';
// Relative, not the '@/services' barrel: this file is itself re-exported by
// that barrel, and a barrel self-import is a module cycle (benign under
// Metro's CJS interop today, but one hoisted usage away from breaking).
// Sibling hooks (usePractice, useQuiz) import the same module the same way.
import { flushPendingResults } from '../pendingResults';
import { setAccessToken, clearAccessToken } from '../secureToken';

export default function useAuth() {
  const dispatch = useAppDispatch();
  const api = useApi();
  const profile = useAppSelector(getProfile);
  const [isLogginIn, setIsLogginIn] = useState(false);
  const [error, setError] = useState('');

  const { uploadContentToCloud, uploadContentToRpi } = useSyncContent();

  const login = async (payload: LoginPayload) => {
    try {
      // router.replace('/teacher/dashboard');

      // Test LMS

      // await api.Ping();

      // const lmsPayload = toAuthPayload(payload, true) as LmsLoginPayload;
      // const lmsResponse = await api.lmsLogin(lmsPayload);
      // await api.setHeaders({
      //   authorization: `Bearer ${_.get(lmsResponse.data, 'data.accessToken')}`,
      // });

      // await uploadContentToCloud();
      // return;
      setIsLogginIn(true);
      setError('');
      const authPayload = toAuthPayload(payload, false) as EdtechLoginPayload;
      const response = await api.login(authPayload);
      const accessToken = _.get(response.data, 'data.accessToken');
      await api.setHeaders({
        authorization: `Bearer ${accessToken}`,
      });

      const profileString = Decoder(accessToken || '');
      const profile = JSON.parse(profileString) as Profile;

      console.log('===> Profile: ', profile);

      await dispatch(
        AuthenticationActions.updateAccessToken({
          accessToken,
          profile,
        }),
      );
      // setAccessToken() itself never rejects (secureToken.ts catches and
      // logs internally), but this is wrapped anyway so a persistence
      // failure can never abort login — the user is already authenticated
      // in redux and on the api instance by this point, and must still
      // reach flushPendingResults/navigation below.
      if (accessToken) {
        try {
          await setAccessToken(accessToken);
        } catch {
          // secureToken.ts already logged this; login proceeds regardless.
        }
      }

      // Drain any items parked by a previous user on this device now that
      // the api instance carries the new user's token and the store carries
      // their profile — fire-and-forget, same as the app-start flush in
      // app/(app)/_layout.tsx; the flush chain never rejects.
      flushPendingResults(api);

      // A dev who has manually toggled the theme pill keeps their choice —
      // the server-derived claim only applies until the pill is touched.
      const uithemeClaim = profile.uitheme;
      if (
        (uithemeClaim === 'kids' || uithemeClaim === 'corporate') &&
        !(__DEV__ && isDevPillTouched())
      ) {
        dispatch(SettingActions.changeThemeAction(uithemeClaim));
      }

      // await uploadContentToRpi();
      // return;
      // router.replace('/home');
      if (profile.schooluserrole === 4) router.replace('/home');
      else router.replace('/teacher/dashboard');
    } catch (e) {
      setError(`${e}`);
    } finally {
      setIsLogginIn(false);
    }
  };

  const logout = async () => {
    // Clear the apisauce authorization header before the redux dispatch —
    // clearAllData() resets AuthenticationSlice's accessToken, but the Api
    // instance's headers are independent state that setHeaders() never
    // unsets, so the token otherwise keeps authenticating requests made
    // after logout.
    api.clearAuthHeader();
    await dispatch(clearAllData());
    // clearAccessToken() itself never rejects (secureToken.ts catches and
    // logs internally), but the finally is kept as a hard guarantee: the
    // user must land back on /login even if SecureStore misbehaves —
    // leaving them on an authenticated-looking screen after logout would
    // be worse than a clear that silently failed.
    try {
      await clearAccessToken();
    } finally {
      router.replace('/login');
    }
  };

  return { login, logout, isLogginIn, profile, error, setError };
}

// TEMP: mutation-proof for the tsc-guard CI check (reverted immediately after)
const __ci_mutation_type_error: number = "this is not a number";
