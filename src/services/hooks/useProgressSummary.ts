import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import { getProfile, getProgressSummary, ProgressActions } from '@/redux/slices';
import { ProgressSummary, normaliseProgressSummary } from '@/models';

/**
 * Cross-curriculum progress summary for the current student ("My progress"),
 * backed by the persisted `progress` redux slice so the screen still has
 * something to show offline. Mirrors useStudentProgress's guards: a request-
 * id ref so a stale response can't clobber a newer one, an unmount guard,
 * `isStale` only flips when there's a cached summary to flag as stale, and a
 * failed fetch never clears the cache.
 *
 * Fetches on mount and whenever the resolved studentId changes.
 */
export default function useProgressSummary() {
  const api = useApi();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(getProfile);
  const studentId = profile?.studentid;
  const summary = useAppSelector(getProgressSummary(studentId));

  const [loading, setLoading] = useState(() => !!studentId && !summary);
  const [error, setError] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Guards against setState after unmount and against applying a response
  // for a studentId that is no longer the current one.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!studentId) {
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
      const response = await api.fetchProgressSummary();
      if (!isCurrent()) return;

      const payload = response.data?.data;
      if (
        response.ok &&
        response.data &&
        !response.data.error &&
        payload &&
        payload.curricula &&
        payload.totals
      ) {
        const normalised: ProgressSummary = normaliseProgressSummary(
          studentId,
          payload,
        );
        dispatch(ProgressActions.setProgressSummary(normalised));
        setError(false);
        setIsStale(false);
      } else {
        // Offline, 5xx, `error: true`, or an `ok` response with missing/null
        // data (or missing curricula/totals) -- keep whatever is cached and
        // just flag it as stale instead of clearing it.
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
  }, [api, studentId, dispatch]);

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return {
    summary,
    loading,
    error,
    isStale: isStale && !!summary,
    refresh: fetchSummary,
  };
}
