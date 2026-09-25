import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  ActivityProgressActions,
  ActivityProgressEntry,
  getActivityProgressByUser,
  getLevelStepsStructure,
  getProfile,
  LevelStepsActions,
} from '@/redux/slices';
import type { LessonStepDotsProps, StepInfo } from '@/components/ui';

type LessonSteps = LessonStepDotsProps['steps'];

function stepInfoFor(
  ids: string[],
  entries: Record<string, ActivityProgressEntry | undefined>,
): StepInfo {
  const total = ids.length;
  if (total === 0) return { state: 'todo', done: 0, total: 0 };

  const doneCount = ids.filter(id => entries[id]?.status === 'done').length;
  if (doneCount === total) return { state: 'done', done: doneCount, total };

  const anyStarted = ids.some(
    id => entries[id]?.status === 'done' || entries[id]?.status === 'inProgress',
  );
  return { state: anyStarted ? 'current' : 'todo', done: doneCount, total };
}

/**
 * Real per-step (Learning/Practice/Quiz) dot state for every lesson in a
 * level, backed by `lesson/level/:levelid/steps`. Structure (which item ids
 * belong to which lesson) is cached offline in the persisted `levelSteps`
 * slice, keyed by levelid; item statuses are merged into the existing
 * `activityProgress` slice (same store the Lesson screen's
 * useActivityProgress reads/writes), so an offline practice/quiz/video
 * completion recorded there shows up here too without waiting on a fetch.
 *
 * Fetches on mount + every screen focus, and fails silently (offline) like
 * useActivityProgress — whatever structure/status is already cached keeps
 * rendering. `stepsFor` returns `undefined` for a lesson whose structure
 * hasn't been cached yet (first load, offline, before any fetch has
 * succeeded); callers should fall back to an estimate in that case.
 */
export default function useLevelSteps(levelId: string) {
  const api = useApi();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(getProfile)?.schooluserid ?? null;
  const structure = useAppSelector(getLevelStepsStructure(levelId));
  const byUser = useAppSelector(getActivityProgressByUser);
  const entries = (userId && byUser[userId]) || {};

  const fetchLevelSteps = useCallback(async () => {
    if (!levelId || !userId) return;
    try {
      const response = await api.fetchLevelSteps(levelId);
      const data = response.data?.data;
      if (response.ok && data) {
        dispatch(LevelStepsActions.cacheLevelSteps(data));
        dispatch(
          ActivityProgressActions.mergeServerLevel({ userId, response: data }),
        );
      }
    } catch {
      // Offline or the endpoint is unreachable — whatever structure/status
      // is already cached (if any) keeps rendering.
    }
  }, [api, dispatch, levelId, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchLevelSteps();
    }, [fetchLevelSteps]),
  );

  const stepsFor = useCallback(
    (lessonid: string): LessonSteps | undefined => {
      const lessonStructure = structure?.lessons[lessonid];
      if (!lessonStructure) return undefined;
      return {
        learning: stepInfoFor(lessonStructure.learningIds, entries),
        practice: stepInfoFor(lessonStructure.practiceIds, entries),
        quiz: stepInfoFor(lessonStructure.quizIds, entries),
      };
    },
    [structure, entries],
  );

  return {
    fetchLevelSteps,
    stepsFor,
  };
}
