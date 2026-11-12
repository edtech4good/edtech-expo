// How awards are fetched and when a result may raise the "Award earned"
// sheet. Pure and dependency-injected (no store, no react-native), so
// `yarn test:awards` runs it under plain node; services/awards.ts wires it to
// the real store and API.
import type { AwardsOverview, AwardsOverviewResponse } from '@/models';
import {
  allAwardIds,
  awardsEarnedByResult,
  decideSeen,
  normaliseAwardsOverview,
} from '@/screens/MyProgress/awards/awardsLogic';
import { AwardsActions } from '@/redux/slices/AwardsSlice';
import {
  AwardSheetActions,
  type AwardSheetEntry,
} from '@/redux/slices/AwardSheetSlice';

/** A result the server accepted counts toward a sheet for this long. */
export const RESULT_FRESH_MS = 60_000;

export type AwardsFetchOutcome = 'ok' | 'unsupported' | 'failed';

export interface AwardsFetchEnv {
  fetchOverview(): Promise<{
    ok?: boolean;
    status?: number | null;
    data?: AwardsOverviewResponse | null;
  }>;
  studentId(): string | undefined;
  seenAwardIds(studentId: string): string[] | null;
  dispatch(action: unknown): unknown;
  now(): number;
}

// ----------------------------------------------------------------- state
// Session-only (a restart forgets both).
let requestSeq = 0;
let appliedSeq = 0;
let recentResults: { startMs: number; at: number }[] = [];

export function resetAwardsFlowForTest(): void {
  requestSeq = 0;
  appliedSeq = 0;
  recentResults = [];
}

/**
 * Remember that the server accepted a result that started at `startMs` (the
 * `starttime` the app sent, which the server stores as the award's `earnedat`).
 * Any fetch of the overview within RESULT_FRESH_MS may match an award to it.
 */
export function noteSyncedResult(startMs: number, now: number): void {
  if (!Number.isFinite(startMs)) return;
  recentResults = recentResults.filter(r => now - r.at <= RESULT_FRESH_MS);
  recentResults.push({ startMs, at: now });
}

const statusOf = (err: unknown): number | undefined => {
  const status = (err as { status?: unknown } | null | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
};

/**
 * Fetch the overview, store it and queue the sheet for an award a recent
 * result earned (awardsLogic.decideSeen). Never throws.
 *  - 'unsupported': the learning server has no awards endpoint (404); the
 *    section hides quietly.
 *  - 'failed': offline, a server error or an unusable body; the cache stays.
 *  - A response that arrives after a LATER request's response was applied never
 *    overwrites it (it may still queue a sheet).
 */
export async function fetchAwards(
  env: AwardsFetchEnv,
): Promise<AwardsFetchOutcome> {
  try {
    const studentId = env.studentId();
    if (!studentId) return 'failed';
    const seq = ++requestSeq;
    let response;
    try {
      response = await env.fetchOverview();
    } catch (err) {
      // The API layer throws for any non-2xx, carrying the status.
      return statusOf(err) === 404 ? 'unsupported' : 'failed';
    }
    if (response?.status === 404) return 'unsupported';
    const payload = response?.data?.data;
    if (!response?.ok || !response.data || response.data.error || !payload) {
      return 'failed';
    }
    // The learner may have changed while the request was out.
    if (env.studentId() !== studentId) return 'failed';

    const now = env.now();
    const overview: AwardsOverview = normaliseAwardsOverview(
      studentId,
      payload,
      now,
    );
    const prevSeen = env.seenAwardIds(studentId);
    recentResults = recentResults.filter(r => now - r.at <= RESULT_FRESH_MS);
    const entries: AwardSheetEntry[] = [];
    const matchedIds: string[] = [];
    recentResults.forEach(r => {
      awardsEarnedByResult(overview, r.startMs).forEach(awardId => {
        if (!matchedIds.includes(awardId)) {
          matchedIds.push(awardId);
          entries.push({ awardId, expiresAt: r.at + RESULT_FRESH_MS });
        }
      });
    });
    const decision = decideSeen({
      prevSeen,
      awardIds: allAwardIds(overview),
      matchedIds,
    });

    if (seq > appliedSeq) {
      appliedSeq = seq;
      env.dispatch(
        AwardsActions.setAwardsOverview({
          overview,
          seenAwardIds: decision.seenAwardIds,
        }),
      );
    }
    const queued = entries.filter(e =>
      decision.sheetAwardIds.includes(e.awardId),
    );
    if (queued.length > 0) {
      env.dispatch(
        AwardSheetActions.queueAwardSheet({ studentId, entries: queued }),
      );
    }
    return 'ok';
  } catch {
    return 'failed';
  }
}

/**
 * After a result the server accepted: remember its start time and refetch the
 * overview in the background. Synchronous, returns at once, never throws, and
 * nothing here is awaited by the save path.
 */
export function checkAwardsAfterResult(
  env: AwardsFetchEnv,
  startMs: number,
): void {
  try {
    if (!Number.isFinite(startMs)) return;
    noteSyncedResult(startMs, env.now());
    fetchAwards(env).catch(() => {});
  } catch {
    // never into the save path
  }
}

/**
 * Save a result, then (corporate, synced only) look for awards in the
 * background. `submit` is the ordinary result save (enqueue first, then flush,
 * exactly as before awards existed): this function awaits ONLY that and
 * returns its answer untouched. The awards check starts after it, is never
 * awaited and can neither delay nor fail the save, whatever it does (hang,
 * throw, reject).
 */
export async function saveResultThenAwards<
  T extends { synced: boolean },
>(input: {
  submit: () => Promise<T>;
  enabled: boolean;
  startMs: unknown;
  afterSynced: (startMs: number) => unknown;
}): Promise<T> {
  const submitted = await input.submit();
  if (
    input.enabled &&
    submitted.synced === true &&
    typeof input.startMs === 'number'
  ) {
    try {
      Promise.resolve(input.afterSynced(input.startMs)).catch(() => {});
    } catch {
      // a throwing check never reaches the save path
    }
  }
  return submitted;
}
