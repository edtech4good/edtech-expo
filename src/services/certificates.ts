import { store } from '@/redux';
import { getProfile, getStudentCertificates } from '@/redux/slices';
import {
  fetchCertificates,
  type CertificatesFetchEnv,
  type CertificatesFetchOutcome,
} from './certificatesFlow';
import type Api from './api/Api';

/** The certificates flow (certificatesFlow.ts) wired to the real store and API. */
function realEnv(api: Api): CertificatesFetchEnv {
  return {
    fetchOverview: () =>
      api.fetchCertificatesOverview() as ReturnType<
        CertificatesFetchEnv['fetchOverview']
      >,
    studentId: () => getProfile(store.getState())?.studentid,
    seenCertificateIds: studentId =>
      getStudentCertificates(studentId)(store.getState())
        ?.seenCertificateIds ?? null,
    dispatch: action =>
      store.dispatch(action as Parameters<typeof store.dispatch>[0]),
    now: () => Date.now(),
  };
}

/** Fetch and store the overview (My progress, the certificate detail). Never throws. */
export function fetchAndStoreCertificates(
  api: Api,
): Promise<CertificatesFetchOutcome> {
  return fetchCertificates(realEnv(api));
}
