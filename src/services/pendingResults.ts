import { Alert, Platform } from 'react-native';
import { store } from '@/redux';
import { getPendingResults, getProfile, PendingResultActions } from '@/redux/slices';
import type { PendingResultItem } from '@/redux/slices';
import type Api from './api/Api';
import { PracticeResult, QuizResult, VideoProgressPayload } from '@/models';
import {
  buildLearningProgressItem,
  classifyFlushError,
  isFlushableBy,
  shouldDropPoison,
} from './pendingResultsQueue';

const SUBMIT_WAIT_MS = 10000;

let flushChain: Promise<void> = Promise.resolve();

async function doFlush(api: Api): Promise<void> {
  try {
    const items = getPendingResults(store.getState());
    for (const snapshot of items) {
      const currentOwnerId = getProfile(store.getState())?.schooluserid ?? null;
      // A null ownerId is a legacy/dev item that predates ownership tracking;
      // treat it as belonging to whoever is currently logged in.
      if (!isFlushableBy(snapshot, currentOwnerId)) {
        continue;
      }
      // Re-read by id: a learning item can be coalesced (and re-id'd) while
      // this loop is awaiting an earlier POST. If it was, skip the stale
      // snapshot — the merged entry goes out on the next flush.
      const item = getPendingResults(store.getState()).find(
        (i: PendingResultItem) => i.id === snapshot.id,
      );
      if (!item) {
        continue;
      }
      try {
        if (item.kind === 'practice') {
          await api.savePracticeResult(
            item.lessonId,
            item.payload as PracticeResult,
          );
        } else if (item.kind === 'learning') {
          // Same endpoint and body the online path used to post directly;
          // `date` is the original watch time captured at enqueue.
          await api.saveVideoProgress(
            item.lessonId,
            item.payload as VideoProgressPayload,
          );
        } else {
          await api.saveQuizResult(item.lessonId, item.payload as QuizResult);
        }
        store.dispatch(PendingResultActions.dequeueResult(item.id));
      } catch (err) {
        if (classifyFlushError(err) === 'poison') {
          const status = (err as any)?.status;
          store.dispatch(PendingResultActions.bumpAttempts(item.id));
          const refreshed = getPendingResults(store.getState()).find(
            (i: PendingResultItem) => i.id === item.id,
          );
          const attempts = refreshed?.attempts ?? item.attempts + 1;
          if (shouldDropPoison(attempts, item.queuedAt, Date.now())) {
            store.dispatch(PendingResultActions.dequeueResult(item.id));
            console.warn(
              `[pendingResults] dropping poison item id=${item.id} kind=${item.kind} lessonId=${item.lessonId} status=${status} attempts=${attempts} serverMessage=${(err as any)?.serverMessage ?? ''}`,
            );
          }
          continue;
        }
        return;
      }
    }
  } catch {
    // doFlush must never reject the flush chain.
  }
}

export function flushPendingResults(api: Api): Promise<void> {
  flushChain = flushChain.then(() => doFlush(api));
  return flushChain;
}

function newItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function submitResult(
  api: Api,
  input: {
    kind: 'practice' | 'quiz';
    lessonId: string;
    payload: PracticeResult | QuizResult;
  },
): Promise<{ synced: boolean }> {
  const item: PendingResultItem = {
    id: newItemId(),
    ...input,
    queuedAt: Date.now(),
    attempts: 0,
    ownerId: getProfile(store.getState())?.schooluserid ?? null,
  };

  store.dispatch(PendingResultActions.enqueueResult(item));

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>(resolve => {
    timer = setTimeout(resolve, SUBMIT_WAIT_MS);
  });
  const flush = flushPendingResults(api).catch(() => {});

  await Promise.race([flush, timeout]);
  clearTimeout(timer);

  return {
    synced: !getPendingResults(store.getState()).some((i: PendingResultItem) => i.id === item.id),
  };
}

/**
 * Video (learning) progress goes through the same queue as practice/quiz
 * results: enqueue first, then flush — never a direct POST. That is what
 * makes it offline-safe (a failed POST leaves it queued; the flush's error
 * classification decides retry vs poison) and it keeps FIFO order, which
 * matters because the server's progress column is last-write-wins: a direct
 * POST that overtook an older queued report would be overwritten by it.
 *
 * Unlike submitResult this does not wait for the flush — the only caller is
 * the Lesson screen's unmount/completion save, which shows nothing about
 * sync state and must not hold up its clear(). The Lesson list derives
 * "saved on device, not synced" from the queue (useActivityProgress).
 */
export function queueLearningProgress(
  api: Api,
  lessonLearningId: string,
  payload: VideoProgressPayload,
): void {
  const item = buildLearningProgressItem({
    id: newItemId(),
    lessonLearningId,
    payload,
    ownerId: getProfile(store.getState())?.schooluserid,
    now: Date.now(),
  });
  // Not logged in: nothing to attribute the watch to, so nothing is queued
  // (useLearning skips markLocal in the same case).
  if (!item) return;
  store.dispatch(PendingResultActions.enqueueResult(item));
  flushPendingResults(api).catch(() => {});
}

export function notifyResultQueued(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
