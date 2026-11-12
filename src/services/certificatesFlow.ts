// How the certificates overview is fetched and stored. Pure and
// dependency-injected (no store, no react-native), so `yarn test:certificates`
// runs it under plain node; services/certificates.ts wires it to the real store
// and API.
import type { CertificatesOverviewResponse } from '@/models';
import {
  issuedIds,
  normaliseCertificatesOverview,
  seenAfterFetch,
} from '@/screens/MyProgress/certificates/certificatesLogic';
import { CertificatesActions } from '@/redux/slices/CertificatesSlice';

export type CertificatesFetchOutcome = 'ok' | 'unsupported' | 'failed';

export interface CertificatesFetchEnv {
  fetchOverview(): Promise<{
    ok?: boolean;
    status?: number | null;
    data?: CertificatesOverviewResponse | null;
  }>;
  studentId(): string | undefined;
  seenCertificateIds(studentId: string): string[] | null;
  dispatch(action: unknown): unknown;
  now(): number;
}

// Session-only (a restart forgets all three).
let requestSeq = 0;
let appliedSeq = 0;
// A server that answered 404 has no route; it is not asked again this session,
// so a focus-refresh loop never hammers an older server.
let unsupportedSession = false;

export function resetCertificatesFlowForTest(): void {
  requestSeq = 0;
  appliedSeq = 0;
  unsupportedSession = false;
}

const statusOf = (err: unknown): number | undefined => {
  const status = (err as { status?: unknown } | null | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
};

/**
 * Fetch the overview and store it. Never throws.
 *  - 'unsupported': the learning server has no certificates route (404); the
 *    section hides quietly and the route is not asked again this session.
 *  - 'failed': offline, a server error or an unusable body; the cache stays.
 *  - A response that arrives after a LATER request's response was applied never
 *    overwrites it.
 */
export async function fetchCertificates(
  env: CertificatesFetchEnv,
): Promise<CertificatesFetchOutcome> {
  try {
    if (unsupportedSession) return 'unsupported';
    const studentId = env.studentId();
    if (!studentId) return 'failed';
    const seq = ++requestSeq;
    let response;
    try {
      response = await env.fetchOverview();
    } catch (err) {
      // The API layer throws for any non-2xx, carrying the status.
      if (statusOf(err) === 404) {
        unsupportedSession = true;
        return 'unsupported';
      }
      return 'failed';
    }
    if (response?.status === 404) {
      unsupportedSession = true;
      return 'unsupported';
    }
    const payload = response?.data?.data;
    if (!response?.ok || !response.data || response.data.error || !payload) {
      return 'failed';
    }
    // The learner may have changed while the request was out.
    if (env.studentId() !== studentId) return 'failed';

    const overview = normaliseCertificatesOverview(studentId, payload, env.now());
    if (seq > appliedSeq) {
      appliedSeq = seq;
      env.dispatch(
        CertificatesActions.setCertificatesOverview({
          overview,
          seenCertificateIds: seenAfterFetch(
            env.seenCertificateIds(studentId),
            issuedIds(overview),
          ),
        }),
      );
    }
    return 'ok';
  } catch {
    return 'failed';
  }
}
