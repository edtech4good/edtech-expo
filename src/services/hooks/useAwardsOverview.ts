import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppSelector } from '@/redux';
import { getProfile, getStudentAwards } from '@/redux/slices';
import { fetchAndStoreAwards } from '../awards';
import useDesign from './useDesign';

/**
 * The learner's awards for My progress, cached in the persisted `awards`
 * slice so the last-known awards show offline. Same stale/refresh behaviour as
 * useProgressSummary: fetch on mount and when the student changes, a failed
 * fetch keeps the cache and only flags it stale.
 *
 * Corporate only: with any other design the hook does nothing (the kids app
 * has no My progress page). `unsupported` is true when the learning server
 * has no awards endpoint (404): the Awards section then hides quietly.
 * `onlyIfMissing` (the award detail) fetches only when nothing is cached yet.
 */
export default function useAwardsOverview(
  options: { onlyIfMissing?: boolean } = {},
) {
  const api = useApi();
  const { isCorporate } = useDesign();
  const profile = useAppSelector(getProfile);
  const studentId = profile?.studentid;
  const entry = useAppSelector(getStudentAwards(studentId));
  const overview = entry?.overview;
  const enabled = isCorporate && !!studentId;

  const [loading, setLoading] = useState(() => enabled && !overview);
  const [error, setError] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
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
    const outcome = await fetchAndStoreAwards(api);
    if (!isCurrent()) return;
    setUnsupported(outcome === 'unsupported');
    // Unsupported is not an error: no message, no Retry.
    setError(outcome === 'failed');
    setIsStale(outcome === 'failed');
    setLoading(false);
  }, [api, enabled, studentId]);

  useEffect(() => {
    if (options.onlyIfMissing && overview) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, enabled]);

  return {
    overview,
    seenAwardIds: entry?.seenAwardIds ?? null,
    loading,
    error,
    unsupported,
    isStale: isStale && !!overview,
    refresh,
  };
}
