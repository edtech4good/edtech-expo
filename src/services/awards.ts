import { store } from '@/redux';
import { getProfile, getStudentAwards } from '@/redux/slices';
import {
  checkAwardsAfterResult,
  fetchAwards,
  type AwardsFetchEnv,
  type AwardsFetchOutcome,
} from './awardsFlow';
import type Api from './api/Api';

/** The awards flow (awardsFlow.ts) wired to the real store and API. */
function realEnv(api: Api): AwardsFetchEnv {
  return {
    fetchOverview: () =>
      api.fetchAwardsOverview() as ReturnType<AwardsFetchEnv['fetchOverview']>,
    studentId: () => getProfile(store.getState())?.studentid,
    seenAwardIds: studentId =>
      getStudentAwards(studentId)(store.getState())?.seenAwardIds ?? null,
    dispatch: action =>
      store.dispatch(action as Parameters<typeof store.dispatch>[0]),
    now: () => Date.now(),
  };
}

/** Fetch and store the overview (My progress, the award detail). Never throws. */
export function fetchAndStoreAwards(api: Api): Promise<AwardsFetchOutcome> {
  return fetchAwards(realEnv(api));
}

/**
 * After a result the server accepted: refetch in the background so an award
 * it earned can raise the sheet. Returns at once; never throws.
 */
export function refreshAwardsAfterResult(api: Api, startMs: number): void {
  checkAwardsAfterResult(realEnv(api), startMs);
}
