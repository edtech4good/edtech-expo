/**
 * apisauce `problem` values that mean the request got no HTTP response at
 * all: no connection, DNS or TLS failure, or a timeout. The server never
 * answered, so there is no status code and no body to show.
 *
 * Kept free of imports so plain `tsx` tests can load it.
 */
export const NETWORK_PROBLEMS = [
  'NETWORK_ERROR',
  'CONNECTION_ERROR',
  'TIMEOUT_ERROR',
] as const;

export function isNetworkProblem(problem: string | null | undefined): boolean {
  return (NETWORK_PROBLEMS as readonly string[]).includes(problem ?? '');
}
