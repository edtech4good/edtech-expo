import { useAppDispatch, useAppSelector } from '@/redux';
import { useApi } from '../api/ApiContext';
import { useEffect, useRef, useState } from 'react';
import {
  getCachedLesson,
  getLesson,
  LessonActions,
  LessonCacheActions,
  SelectionActions,
} from '@/redux/slices';
import { LessonLearning, LessonPractice, LessonQuiz } from '@/models';

export default function useLesson(lessonId: string) {
  const api = useApi();
  const dispatch = useAppDispatch();
  const lesson = useAppSelector(getLesson);
  const cachedLesson = useAppSelector(getCachedLesson(lessonId));
  const [isFetching, setIsFetching] = useState(false);

  // The lessonId a fetch() currently in flight is for. Set when fetch()
  // starts, cleared by clear() (called from the screen's effect cleanup
  // whenever lessonId changes, which fires before the next fetch() starts —
  // see LessonSelectionScreen) and on unmount. A fetch that resolves after
  // the screen has moved on to a different lesson checks this ref and must
  // not overwrite what's now on screen.
  const activeLessonIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      activeLessonIdRef.current = null;
    };
  }, []);

  const fetch = async () => {
    const requestedLessonId = lessonId;
    activeLessonIdRef.current = requestedLessonId;

    // Show cached content immediately: if the store doesn't already hold
    // THIS lesson (e.g. a cold start, navigating in from a different lesson,
    // or the previous visit's `clear()` wiped it) but it's in the cache,
    // render that right away instead of leaving the screen blank while the
    // network call is in flight.
    if (lesson?.lessonid !== lessonId && cachedLesson) {
      await dispatch(LessonActions.updateLesson(cachedLesson));
    }

    await setIsFetching(true);
    try {
      const response = await api.fetchChapters(lessonId);
      const data = response.data?.data;
      if (response.ok && data) {
        // Caching the fetched lesson is harmless even if the screen has
        // since moved on — it's keyed by lessonId, not by "current screen".
        await dispatch(LessonCacheActions.cacheLesson(data));
        if (activeLessonIdRef.current === requestedLessonId) {
          await dispatch(LessonActions.updateLesson(data));
        }
      }
    } catch (error) {
      // Api.ts's response transform throws on any non-ok response, tagging
      // the Error with `.problem` (apisauce's NETWORK_ERROR/TIMEOUT_ERROR/
      // CONNECTION_ERROR/CLIENT_ERROR/...) and `.status`.
      const problem = (error as { problem?: string })?.problem;
      const status = (error as { status?: number })?.status;
      const isConnectivityProblem =
        problem === 'NETWORK_ERROR' ||
        problem === 'TIMEOUT_ERROR' ||
        problem === 'CONNECTION_ERROR';

      if (isConnectivityProblem) {
        // Offline / unreachable: fall back to the cache, but only if this
        // lesson is still the one on screen — otherwise we'd stomp on
        // whatever lesson the user has since navigated to.
        if (activeLessonIdRef.current === requestedLessonId && cachedLesson) {
          await dispatch(LessonActions.updateLesson(cachedLesson));
        }
      } else if (problem === 'CLIENT_ERROR' && status === 404) {
        // The lesson no longer exists server-side — drop any stale cached
        // copy rather than keep offering it. Leave the store's current
        // lesson alone; it's not this hook's job to clear the screen.
        await dispatch(LessonCacheActions.removeCachedLesson(lessonId));
      }
      // Any other error: leave the store alone (no fallback, no dispatch of
      // undefined).
    }
    await setIsFetching(false);
  };

  const selectModule = async (
    mod: LessonLearning | LessonPractice | LessonQuiz,
  ) => {
    await dispatch(SelectionActions.selectModule(mod));
  };

  const clear = async () => {
    activeLessonIdRef.current = null;
    await dispatch(LessonActions.clear());
  };

  return { fetch, clear, selectModule, isFetching, lesson };
}
