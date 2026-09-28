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

// The four pieces of a login failure, held together so they can only ever
// change in one render. See the `loginError` state below for why: React
// Native's legacy-architecture root doesn't batch state updates made outside
// a React event handler (e.g. inside an async catch block after an
// `await`), so four separate `useState`s here let LoginScreen's
// modal-visibility effect observe an intermediate render where `message` is
// set but `status`/`code` aren't — misclassifying a wrong-credentials 400 as
// a generic failure and popping the modal before the real, correct
// inline field error renders underneath it.
interface LoginError {
  message: string;
  // HTTP status of the last login failure (set alongside `message`), so
  // callers can tell a bad-credentials 400 apart from a network/5xx/429
  // failure without re-parsing the stringified error. undefined for a
  // network-level failure (Api.ts's responseTransform never sets `status`
  // on those) or when there's no error at all.
  status?: number;
  // Machine-readable classification alongside `message`/`status`, lifted
  // straight from Api.ts's responseTransform (see the `code`/`errormessage`
  // it attaches to the thrown error). `code` is undefined against an
  // older student API build that hasn't picked up edtech-lms-rpi-api#75
  // (merged) yet — e.g. a classroom Pi still on an older image; on those,
  // `errormessage` carries the raw, unlocalized `errormessage` body text
  // instead. Callers should classify on these, not by parsing `message`'s
  // string.
  code?: string;
  errormessage?: string;
}

const EMPTY_LOGIN_ERROR: LoginError = {
  message: '',
  status: undefined,
  code: undefined,
  errormessage: undefined,
};

export default function useAuth() {
  const dispatch = useAppDispatch();
  const api = useApi();
  const profile = useAppSelector(getProfile);
  const [isLogginIn, setIsLogginIn] = useState(false);
  // Held as one object (not four separate useStates) so the catch block
  // below can update `message`/`status`/`code`/`errormessage` together, in a
  // single setState call, and LoginScreen's effects can never observe a
  // render where only some of them have updated. See LoginError above.
  const [loginError, setLoginError] = useState<LoginError>(
    EMPTY_LOGIN_ERROR,
  );
  const {
    message: error,
    status: errorStatus,
    code: errorCode,
    errormessage: errorMessage,
  } = loginError;

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
      setLoginError(EMPTY_LOGIN_ERROR);
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
      // Set as one object, in one setState call — see LoginError above.
      // Splitting this into `setError`/`setErrorStatus`/`setErrorCode`/
      // `setErrorMessage` calls let LoginScreen's modal-visibility effect
      // run on an intermediate render (message set, status/code still
      // undefined) under React Native's unbatched legacy-architecture root,
      // misfiring the generic-error modal ahead of the correct inline
      // wrong-credentials field error.
      const err = e as
        | { status?: number; code?: string; errormessage?: string }
        | undefined;
      setLoginError({
        message: `${e}`,
        status: err?.status,
        code: err?.code,
        errormessage: err?.errormessage,
      });
    } finally {
      setIsLogginIn(false);
    }
  };

  // Clears the login-failure state as a unit. Callers (e.g. dismissing the
  // error modal) must not clear `error` alone: the modal-visibility effect
  // in LoginScreen also reads `errorStatus`/`errorCode`/`errorMessage`, and
  // a leftover value there could feed a stale classification into the next
  // render before a fresh login attempt overwrites it. Setting the single
  // `loginError` object guarantees that already.
  const resetError = () => {
    setLoginError(EMPTY_LOGIN_ERROR);
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

  // Kept for API compatibility with existing callers of `setError` (none
  // currently call it with a non-empty message; resetError above already
  // covers the `setError('')` case). Setting a message alone clears
  // `status`/`code`/`errormessage` together with it, matching the old
  // four-setState behavior where those were never set independently of
  // `error`.
  const setError = (message: string) => {
    setLoginError({ ...EMPTY_LOGIN_ERROR, message });
  };

  return {
    login,
    logout,
    isLogginIn,
    profile,
    error,
    setError,
    resetError,
    errorStatus,
    errorCode,
    errorMessage,
  };
}
