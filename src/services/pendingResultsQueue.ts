/**
 * Pure queue rules for the offline pending-results queue — no react-native,
 * no store, no api — so `src/services/__tests__/pendingResultsQueue.ts` can
 * run them under plain node (`yarn test:queue`). pendingResults.ts (the
 * flush) and PendingResultSlice.ts (the reducer) both call into this file.
 */
import type {
  PracticeResult,
  QuizResult,
  VideoProgressPayload,
} from '@/models';

export type PendingResultKind = 'practice' | 'quiz' | 'learning';

export interface PendingResultItem {
  id: string;
  kind: PendingResultKind;
  /**
   * The activity id the payload is posted against: lessonpracticeid,
   * lessonquizid, or (kind 'learning') lessonlearningid.
   */
  lessonId: string;
  payload: PracticeResult | QuizResult | VideoProgressPayload;
  queuedAt: number;
  attempts: number;
  ownerId: string | null;
}

export const MAX_POISON_ATTEMPTS = 10;
export const MIN_POISON_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Collapse two video-progress reports for the same learning into the one the
 * server should receive:
 * - time / content_length: the MAX (furthest point watched; same video, so
 *   content_length only differs if one report was media-less and reported 0).
 * - ended: any(ended) — once a watch reached the end, the learning is done.
 * - date: the watch time the server will attribute the report to (it is used
 *   as lastupdated AND as the day bucket for the first-view points/reward in
 *   rpi-api updatelearningprogress). If either report ended, keep the
 *   earliest ended report's date — that is when the completion (and its
 *   points) was earned. Otherwise keep the latest date. Never the flush time.
 */
export function coalesceLearningProgress(
  older: VideoProgressPayload,
  newer: VideoProgressPayload,
): VideoProgressPayload {
  const endedDates = [older, newer].filter(p => p.ended).map(p => p.date);
  return {
    time: Math.max(older.time, newer.time),
    content_length: Math.max(older.content_length, newer.content_length),
    ended: older.ended || newer.ended,
    date:
      endedDates.length > 0
        ? Math.min(...endedDates)
        : Math.max(older.date, newer.date),
  };
}

/**
 * Enqueue `item`. Practice/quiz results always append (each attempt is its
 * own result). A learning report is coalesced into an already-queued report
 * for the same learning + owner, in that entry's queue position (so FIFO
 * order against other items is unchanged), keeping its queuedAt/attempts
 * (poison age counts from the first report) but taking the NEW item's id:
 * a flush that is mid-POST with the old payload then finds its id gone and
 * does not dequeue the merged entry, which is sent on the next flush.
 */
export function enqueuePendingItem(
  items: PendingResultItem[],
  item: PendingResultItem,
): PendingResultItem[] {
  if (item.kind === 'learning') {
    const idx = items.findIndex(
      i =>
        i.kind === 'learning' &&
        i.lessonId === item.lessonId &&
        i.ownerId === item.ownerId,
    );
    if (idx !== -1) {
      const existing = items[idx];
      const merged: PendingResultItem = {
        ...existing,
        id: item.id,
        payload: coalesceLearningProgress(
          existing.payload as VideoProgressPayload,
          item.payload as VideoProgressPayload,
        ),
      };
      return [...items.slice(0, idx), merged, ...items.slice(idx + 1)];
    }
  }
  return [...items, item];
}

/**
 * What a flush does with an item whose POST threw:
 * - 'poison': skip-and-retry. A 4xx that may or may not repeat — count an
 *   attempt and move on to the next item, so one bad item can't block the
 *   queue. The item is KEPT and retried on every later flush; it is dropped
 *   only after 10 attempts AND 24 h (shouldDropPoison). That is why a
 *   transient 4xx needs no special case here — e.g. rpi-api
 *   updatelearningprogress wraps any in-transaction DB error (lock wait,
 *   deadlock) as a 400: as poison it is simply retried on the next flush.
 * - 'stop': halt the whole flush and keep everything for the next one
 *   (preserves order). Reserved for conditions that affect EVERY item:
 *   offline (no status), a 5xx, 401 (token), 408, 429. Classifying an
 *   item-specific error as 'stop' would let one permanently rejected item
 *   block every practice/quiz result queued behind it, forever.
 */
export function classifyFlushError(err: unknown): 'poison' | 'stop' {
  const status = (err as any)?.status;
  const isPoisonPayload =
    typeof status === 'number' &&
    status >= 400 &&
    status <= 499 &&
    status !== 401 &&
    status !== 408 &&
    status !== 429;
  return isPoisonPayload ? 'poison' : 'stop';
}

/**
 * The queue item for a video-progress report, or null when nobody is logged
 * in: an ownerless (null) item would be flushed by whichever user logs in
 * next (isFlushableBy treats null as legacy), crediting their account with
 * someone else's watch. Same gate useLearning puts on markLocal.
 */
export function buildLearningProgressItem(input: {
  id: string;
  lessonLearningId: string;
  payload: VideoProgressPayload;
  ownerId: string | null | undefined;
  now: number;
}): PendingResultItem | null {
  if (!input.ownerId) return null;
  return {
    id: input.id,
    kind: 'learning',
    lessonId: input.lessonLearningId,
    payload: input.payload,
    queuedAt: input.now,
    attempts: 0,
    ownerId: input.ownerId,
  };
}

/** A poison item is dropped only after enough attempts AND enough age. */
export function shouldDropPoison(
  attempts: number,
  queuedAt: number,
  now: number,
): boolean {
  return attempts >= MAX_POISON_ATTEMPTS && now - queuedAt > MIN_POISON_AGE_MS;
}

/**
 * Items the current user's flush should send: their own, plus legacy items
 * with a null ownerId (queued before ownership tracking).
 */
export function isFlushableBy(
  item: PendingResultItem,
  currentOwnerId: string | null,
): boolean {
  return item.ownerId === null || item.ownerId === currentOwnerId;
}
