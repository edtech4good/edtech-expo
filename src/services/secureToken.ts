import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'accessToken';

// expo-secure-store has no web implementation (it wraps iOS Keychain /
// Android Keystore). On web we fall back to sessionStorage, which is
// per-tab and cleared on close — not as strong as SecureStore, but it
// keeps the token out of AsyncStorage/localStorage on that platform too.
const isWeb = Platform.OS === 'web';

// SecureStore.*Async rejects (rather than resolving null/void) when the
// platform keystore is unavailable or corrupted — an OS upgrade, a
// rooted/OEM-modified device, etc. warn survives the release console strip
// (babel.config.js only removes log/info/debug) and carries no token, only
// the operation name and the error message.
function warn(op: string, error: unknown): void {
  // eslint-disable-next-line no-console
  console.warn(
    '[secureToken]',
    op,
    'failed',
    error instanceof Error ? error.message : error,
  );
}

export async function getAccessToken(): Promise<string | null> {
  if (isWeb) {
    try {
      return sessionStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    warn('getAccessToken', error);
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  if (isWeb) {
    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch {
      // ignore — best effort on web
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    warn('setAccessToken', error);
  }
}

export async function clearAccessToken(): Promise<void> {
  if (isWeb) {
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore — best effort on web
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    warn('clearAccessToken', error);
  }
}
