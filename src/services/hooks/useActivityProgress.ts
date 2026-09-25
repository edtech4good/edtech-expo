import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  ActivityProgressActions,
  getActivityProgressByUser,
  getPendingResults,
  getProfile,
} from '@/redux/slices';
import type { PendingResultItem } from '@/redux/slices';
import { ActivityStatus, VideoProgressPayload } from '@/models';

/**
 * Per-activity (learning/practice/quiz) status + progress for a lesson,
 * backed by the persisted `activityProgress` redux slice so it survives
 * offline. Fetches on mount AND on every screen focus (e.g. returning from
 * a quiz) and merges the server snapshot in — never downgrading a status an
 * optimistic local write already set (see ActivityProgressSlice). A fetch
 * failure (offline) is silent: whatever is already in the store keeps
 * rendering.
 */
export default function useActivityProgress(lessonId: string) {
  const api = useApi();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(getProfile)?.schooluserid ?? null;
  const byUser = useAppSelector(getActivityProgressByUser);
  const entries = (userId && byUser[userId]) || {};
  const pendingResults = useAppSelector(getPendingResults);

  const fetchActivityProgress = useCallback(async () => {
    if (!lessonId || !userId) return;
    try {
      const response = await api.fetchActivityProgress(lessonId);
      const data = response.data?.data;
      if (response.ok && data) {
        dispatch(ActivityProgressActions.mergeServer({ userId, response: data }));
      }
    } catch {
      // Offline or the endpoint is unreachable — the locally persisted
      // status (if any) still renders.
    }
  }, [api, dispatch, lessonId, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchActivityProgress();
    }, [fetchActivityProgress]),
  );

  const statusFor = (activityId: string | undefined): ActivityStatus =>
    (activityId && entries[activityId]?.status) || 'todo';

  const questionCountFor = (
    activityId: string | undefined,
  ): number | undefined =>
    (activityId && entries[activityId]?.questionCount) || undefined;

  // An activity (learning, practice or quiz) counts as "not yet synced"
  // only once it's done AND the offline queue still holds a result/progress
  // report for it — checking the queue directly (instead of a stored flag)
  // means this clears the instant flushPendingResults succeeds, without
  // waiting on the next server fetch, and it can never get stuck: there's
  // nothing to clear because nothing is stored. Never true before status is
  // 'done' — a failed/incomplete offline attempt (or a partly watched video)
  // is not "unsynced", it's just not done yet. For a learning, only a queued
  // report that carries the completion (ended) counts: a partial rewatch of
  // an already-synced done video leaves the completion itself synced.
  const unsyncedFor = (activityId: string | undefined): boolean => {
    if (!activityId) return false;
    if (entries[activityId]?.status !== 'done') return false;
    return pendingResults.some(
      (item: PendingResultItem) =>
        item.lessonId === activityId &&
        item.ownerId === userId &&
        (item.kind !== 'learning' ||
          (item.payload as VideoProgressPayload).ended),
    );
  };

  return {
    fetchActivityProgress,
    statusFor,
    questionCountFor,
    unsyncedFor,
  };
}
