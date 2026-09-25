import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  ActivityProgressActions,
  getActivityProgressByUser,
  getProfile,
} from '@/redux/slices';
import { ActivityStatus } from '@/models';

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

  const progressFor = (activityId: string | undefined): number | undefined =>
    (activityId && entries[activityId]?.progress) || undefined;

  return { fetchActivityProgress, statusFor, progressFor };
}
