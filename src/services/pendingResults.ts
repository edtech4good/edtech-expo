import { Alert, Platform } from 'react-native';
import { store } from '@/redux';
import { getPendingResults, getProfile, PendingResultActions } from '@/redux/slices';
import type { PendingResultItem } from '@/redux/slices';
import type Api from './api/Api';
import { PracticeResult, QuizResult } from '@/models';

const SUBMIT_WAIT_MS = 10000;
const MAX_POISON_ATTEMPTS = 10;
const MIN_POISON_AGE_MS = 24 * 60 * 60 * 1000;

let flushChain: Promise<void> = Promise.resolve();

async function doFlush(api: Api): Promise<void> {
  try {
    const items = getPendingResults(store.getState());
    for (const item of items) {
      const currentOwnerId = getProfile(store.getState())?.schooluserid ?? null;
      // A null ownerId is a legacy/dev item that predates ownership tracking;
      // treat it as belonging to whoever is currently logged in.
      if (item.ownerId !== null && item.ownerId !== currentOwnerId) {
        continue;
      }
      try {
        if (item.kind === 'practice') {
          await api.savePracticeResult(
            item.lessonId,
            item.payload as PracticeResult,
          );
        } else {
          await api.saveQuizResult(item.lessonId, item.payload as QuizResult);
        }
        store.dispatch(PendingResultActions.dequeueResult(item.id));
      } catch (err) {
        const status = (err as any)?.status;
        const isPoisonPayload =
          typeof status === 'number' &&
          status >= 400 &&
          status <= 499 &&
          status !== 401 &&
          status !== 408 &&
          status !== 429;
        if (isPoisonPayload) {
          store.dispatch(PendingResultActions.bumpAttempts(item.id));
          const refreshed = getPendingResults(store.getState()).find(
            i => i.id === item.id,
          );
          const attempts = refreshed?.attempts ?? item.attempts + 1;
          const age = Date.now() - item.queuedAt;
          if (attempts >= MAX_POISON_ATTEMPTS && age > MIN_POISON_AGE_MS) {
            store.dispatch(PendingResultActions.dequeueResult(item.id));
            console.warn(
              `[pendingResults] dropping poison item id=${item.id} kind=${item.kind} lessonId=${item.lessonId} status=${status} attempts=${attempts}`,
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

export async function submitResult(
  api: Api,
  input: {
    kind: 'practice' | 'quiz';
    lessonId: string;
    payload: PracticeResult | QuizResult;
  },
): Promise<{ synced: boolean }> {
  const item: PendingResultItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    synced: !getPendingResults(store.getState()).some(i => i.id === item.id),
  };
}

export function notifyResultQueued(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
