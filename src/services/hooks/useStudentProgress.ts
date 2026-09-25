import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  getProfile,
  getSelectedSubject,
  getCurriculumProgress,
  ProgressActions,
} from '@/redux/slices';
import { CurriculumProgress, normaliseCurriculumProgress } from '@/models';

/**
 * Per-grade progress for the student's current curriculum, backed by the
 * persisted `progress` redux slice so the dashboard still has something to
 * show offline. Curriculum resolves from the current subject selection
 * (SelectionSlice `selectedSubject.curriculumid`), falling back to the
 * student's profile `curriculumid` when nothing is selected yet (e.g. a
 * fresh app launch that lands straight on the dashboard).
 *
 * Fetches on mount and whenever the resolved curriculumId changes. A failed
 * fetch (offline, 5xx, `error: true`) never clears the cached snapshot —
 * `isStale` flips true instead so the UI can flag it's showing a cached
 * result.
 */
export default function useStudentProgress() {
  const api = useApi();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(getProfile);
  const selectedSubject = useAppSelector(getSelectedSubject);
  const curriculumId = selectedSubject?.curriculumid ?? profile?.curriculumid;
  const progress = useAppSelector(getCurriculumProgress(curriculumId));

  const [loading, setLoading] = useState(() => !!curriculumId && !progress);
  const [error, setError] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Guards against setState after unmount and against applying a response
  // for a curriculumId that is no longer the current one (e.g. the student
  // switched subjects while the request was in flight).
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!curriculumId) {
      ++requestIdRef.current;
      setLoading(false);
      setError(false);
      setIsStale(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const isCurrent = () =>
      requestIdRef.current === requestId && mountedRef.current;

    setLoading(true);
    setError(false);
    setIsStale(false);
    try {
      const response = await api.fetchCurriculumProgress(curriculumId);
      if (!isCurrent()) return;

      if (response.ok && response.data && !response.data.error) {
        const normalised: CurriculumProgress = normaliseCurriculumProgress(
          curriculumId,
          response.data.data,
        );
        dispatch(ProgressActions.setCurriculumProgress(normalised));
        setError(false);
        setIsStale(false);
      } else {
        // Offline, 5xx, or `error: true` — keep whatever is cached and just
        // flag it as stale instead of clearing it.
        setError(true);
        setIsStale(true);
      }
    } catch {
      if (!isCurrent()) return;
      setError(true);
      setIsStale(true);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [api, curriculumId, dispatch]);

  useEffect(() => {
    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumId]);

  return {
    progress,
    loading,
    error,
    isStale: isStale && !!progress,
    refresh: fetchProgress,
  };
}
