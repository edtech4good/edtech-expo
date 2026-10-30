/**
 * The two session rules the app shares, kept free of React, Redux and
 * expo-router so a plain `tsx` script can test them
 * (src/services/__tests__/session.ts):
 *
 * - where a signed-in user belongs (the sign-in flow and the restore at
 *   start-up both ask `routeForProfile`, so they cannot drift apart), and
 * - how a session ends (sign-out and a refused token both run `endSession`).
 */
import type { Profile } from '@/models';

export const LOGIN_ROUTE = '/login';
export const LEARNER_HOME_ROUTE = '/home';
export const TEACHER_HOME_ROUTE = '/teacher/dashboard';

// schooluserrole 4 is a learner; every other role lands on the teacher side.
// This is the rule sign-in has always used.
const LEARNER_ROLE = 4;

export function routeForProfile(profile: Pick<Profile, 'schooluserrole'>) {
  return profile.schooluserrole === LEARNER_ROLE
    ? LEARNER_HOME_ROUTE
    : TEACHER_HOME_ROUTE;
}

/**
 * Where a freshly started app belongs, from what start-up restored. A token
 * with no profile cannot be placed (the role lives in the profile), so it
 * counts as signed out: the caller drops the stale token.
 */
export function startRoute(session: {
  accessToken?: string | null;
  profile?: Pick<Profile, 'schooluserrole'> | null;
}): string {
  if (!session.accessToken || !session.profile) return LOGIN_ROUTE;
  return routeForProfile(session.profile);
}

/**
 * The routes a cold start opens on: '/' (which redirects to login) and the
 * login screen itself. A web reload on any other path is already where the
 * user was and must not be moved.
 */
export function isEntryPath(pathname: string | null | undefined): boolean {
  return !pathname || pathname === '/' || pathname === LOGIN_ROUTE;
}

export interface EndSessionDeps {
  /** Removes the token from the API client's headers. Runs first, synchronously. */
  clearAuthHeader: () => void;
  /** Resets the redux slices (the profile and the access token with them). */
  clearStore: () => unknown;
  /** Removes the token from SecureStore (sessionStorage on web). */
  clearStoredToken: () => Promise<void>;
  /** Lands on the login screen. */
  goToLogin: () => void;
}

/**
 * Ends the signed-in session: sign-out and a token the server refused take
 * this one path. The header goes first and synchronously so a second refused
 * request arriving behind the first finds nothing left to end. The login
 * screen is reached even if clearing storage fails: leaving the user on an
 * authenticated-looking screen would be worse than a clear that failed.
 */
export async function endSession(deps: EndSessionDeps): Promise<void> {
  deps.clearAuthHeader();
  try {
    await deps.clearStore();
    await deps.clearStoredToken();
  } finally {
    deps.goToLogin();
  }
}
