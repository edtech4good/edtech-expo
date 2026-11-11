import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppSelector } from '@/redux';
import { getProfile, getStudentAwards } from '@/redux/slices';
import { fetchAndStoreAwards } from '../awards';

/**
 * The learner's awards for My progress, cached in the persisted `awards`
 * slice so the last-known awards show offline. Same stale/refresh behaviour as
 * useProgressSummary: fetch on mount and when the student changes, a failed
 * fetch keeps the cache and only flags it stale.
 */
export default function useAwardsOverview() {
  const api = useApi();
  const profile = useAppSelector(getProfile);
  const studentId = profile?.studentid;
  const entry = useAppSelector(getStudentAwards(studentId));
  const overview = entry?.overview;

  const [loading, setLoading] = useState(() => !!studentId && !overview);
  const [error, setError] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
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
    const ok = await fetchAndStoreAwards(api, 'refresh');
    if (!isCurrent()) return;
    setError(!ok);
    setIsStale(!ok);
    setLoading(false);
  }, [api, studentId]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return {
    overview,
    seenAwardIds: entry?.seenAwardIds ?? null,
    loading,
    error,
    isStale: isStale && !!overview,
    refresh,
  };
}
