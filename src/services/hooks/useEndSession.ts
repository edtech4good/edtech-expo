import { clearAllData, useAppDispatch } from '@/redux';
import { router } from 'expo-router';
import { useApi } from '../api/ApiContext';
import { clearAccessToken } from '../secureToken';
import { endSession, LOGIN_ROUTE } from '../session';

/**
 * Returns the function that ends the signed-in session: clears the API
 * header, the redux slices (clearAllData resets the access token and the
 * profile) and the stored token, then lands on /login. Sign-out and a token
 * the server refused both call it.
 */
export default function useEndSession() {
  const api = useApi();
  const dispatch = useAppDispatch();
  return () =>
    endSession({
      clearAuthHeader: () => api.clearAuthHeader(),
      clearStore: () => dispatch(clearAllData()),
      clearStoredToken: clearAccessToken,
      goToLogin: () => router.replace(LOGIN_ROUTE),
    });
}
