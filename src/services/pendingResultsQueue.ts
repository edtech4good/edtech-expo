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
 * The rpi-api messages for a learning-progress 400 that WILL repeat on
 * every retry (lesson.business.ts updatelearningprogress / getlessonlearning
 * / getstudent). Matched exactly; they reach the client as `serverMessage`
 * (the body's `errormessage`, attached in Api.ts responseTransform — the
 * Error's own `message` is axios' generic "Request failed with status code
 * 400" and says nothing about the cause).
 */
export const LEARNING_PERMANENT_400_MESSAGES: readonly string[] = [
  'Learning Lesson Not Found',
  'Student Not Found',
  // sic — the server's spelling. An in-progress report with no content
  // length (media-less item not yet ended).
  'Content Lenght can not equal 0',
];

/**
 * A joi validation failure from SchemaValidationInterceptor
 * (lesson.request.validator.ts `lessonlearningprogress`): joi messages
 * always open with the quoted key/label, e.g. `"time" must be greater than
 * or equal to 0`, `"ended" is required`, `"Invalid Date" must be a valid
 * date`. Several failures are joined with ", ", but the first still leads.
 */
function isJoiValidationMessage(message: string): boolean {
  return /^"[^"]+" /.test(message);
}

/**
 * What a flush does with an item whose POST threw:
 * - 'poison': a 4xx the server will keep rejecting (bad payload, deleted
 *   activity) — count an attempt and move on to the next item, so it can't
 *   block the queue.
 * - 'stop': offline (no status), a 5xx, 401 (token), 408/429 — transient,
 *   stop this flush and keep everything for the next one (preserves order).
 *
 * Stopgap for kind 'learning': rpi-api updatelearningprogress wraps ANY
 * error inside its transaction — including transient DB errors (lock wait,
 * deadlock, lost connection, a unique-key race on first create) — in a 400.
 * So a learning 400 is 'stop' (retry later) unless its server message is one
 * of the known permanent ones above or a joi validation message. The cost:
 * an unrecognised permanent 400 on a learning item blocks the queue behind
 * it until the server is fixed to return 5xx for transient errors.
 */
export function classifyFlushError(
  err: unknown,
  kind?: PendingResultKind,
): 'poison' | 'stop' {
  const status = (err as any)?.status;
  const isPoisonPayload =
    typeof status === 'number' &&
    status >= 400 &&
    status <= 499 &&
    status !== 401 &&
    status !== 408 &&
    status !== 429;
  if (!isPoisonPayload) return 'stop';
  if (kind === 'learning' && status === 400) {
    const serverMessage = (err as any)?.serverMessage;
    const known =
      typeof serverMessage === 'string' &&
      (LEARNING_PERMANENT_400_MESSAGES.includes(serverMessage) ||
        isJoiValidationMessage(serverMessage));
    return known ? 'poison' : 'stop';
  }
  return 'poison';
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
