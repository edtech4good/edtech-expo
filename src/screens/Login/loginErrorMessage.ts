import { isNetworkProblem } from '../../services/api/networkProblem';

/**
 * Which localized message the sign-in error modal shows, if any.
 *
 * Returns a translation key for the failures whose raw text isn't fit for a
 * learner: a 429 (axios' "Request failed with status code 429") and a request
 * that never got a response (Api.ts's developer text about Metro and .env).
 * Returns undefined when the raw message should be shown as before.
 */
export function loginErrorMessageKey(failure: {
  status?: number;
  problem?: string;
}): string | undefined {
  if (failure.status === 429) return 'screen.login.tooManyAttemptsError';
  if (isNetworkProblem(failure.problem)) return 'screen.login.cannotConnectError';
  return undefined;
}
