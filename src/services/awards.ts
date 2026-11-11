import { store } from '@/redux';
import { AwardsActions, getProfile, getStudentAwards } from '@/redux/slices';
import {
  allAwardIds,
  decideSeen,
  normaliseAwardsOverview,
  shouldCheckAwardsAfterResult,
} from '@/screens/MyProgress/awards/awardsLogic';
import type Api from './api/Api';

const BASELINE_WAIT_MS = 3000;

/**
 * Fetch the awards overview and store it, applying the seen/new rule
 * (awardsLogic.decideSeen). Returns false (cache untouched) when offline, on a
 * server error or on an unusable body.
 */
export async function fetchAndStoreAwards(
  api: Api,
  trigger: 'result' | 'refresh',
): Promise<boolean> {
  const studentId = getProfile(store.getState())?.studentid;
  if (!studentId) return false;
  try {
    const response = await api.fetchAwardsOverview();
    const payload = response.data?.data;
    if (!response.ok || !response.data || response.data.error || !payload) {
      return false;
    }
    // The learner may have changed while the request was out.
    if (getProfile(store.getState())?.studentid !== studentId) return false;
    const overview = normaliseAwardsOverview(studentId, payload);
    const prev = getStudentAwards(studentId)(store.getState());
    const decision = decideSeen({
      prevSeen: prev?.seenAwardIds ?? null,
      prevSheet: prev?.sheetAwardIds ?? [],
      awardIds: allAwardIds(overview),
      trigger,
    });
    store.dispatch(AwardsActions.setAwardsOverview({ overview, ...decision }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Before the first result is submitted on a device: take the baseline (every
 * award already earned counts as seen) so the award that THIS result earns is
 * recognised as new instead of being swallowed by the first-fetch rule. Never
 * blocks submitting for more than a few seconds, never throws.
 */
export async function ensureAwardsBaseline(api: Api): Promise<void> {
  const studentId = getProfile(store.getState())?.studentid;
  if (!studentId) return;
  if (getStudentAwards(studentId)(store.getState())?.seenAwardIds) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = new Promise<void>(resolve => {
    timer = setTimeout(resolve, BASELINE_WAIT_MS);
  });
  await Promise.race([fetchAndStoreAwards(api, 'refresh'), wait]);
  clearTimeout(timer);
}

/**
 * After a result: when the server accepted it (not left in the offline
 * queue), refetch so a newly earned award can raise its sheet. Fire and forget.
 */
export function refreshAwardsAfterResult(api: Api, synced: boolean): void {
  if (!shouldCheckAwardsAfterResult(synced)) return;
  fetchAndStoreAwards(api, 'result').catch(() => {});
}
