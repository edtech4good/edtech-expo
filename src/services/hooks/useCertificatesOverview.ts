import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppSelector } from '@/redux';
import { getProfile, getStudentCertificates } from '@/redux/slices';
import { fetchAndStoreCertificates } from '../certificates';
import useDesign from './useDesign';

/**
 * The learner's certificates for My progress, cached in the persisted
 * `certificates` slice so the last-known list shows offline. Fetched whenever
 * the screen gains focus (so a certificate issued meanwhile appears on return);
 * a failed fetch keeps the cache and only flags it stale.
 *
 * Corporate only: with any other design the hook does nothing. `unsupported` is
 * true when the learning server has no certificates route (404): the section
 * then hides quietly and nothing retries. `onlyIfMissing` (the detail screen)
 * fetches only when nothing is cached yet.
 */
export default function useCertificatesOverview(
  options: { onlyIfMissing?: boolean } = {},
) {
  const api = useApi();
  const { isCorporate } = useDesign();
  const profile = useAppSelector(getProfile);
  const studentId = profile?.studentid;
  const entry = useAppSelector(getStudentCertificates(studentId));
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
    const outcome = await fetchAndStoreCertificates(api);
    if (!isCurrent()) return;
    setUnsupported(outcome === 'unsupported');
    // Unsupported is not an error: no message, no Retry.
    setError(outcome === 'failed');
    setIsStale(outcome === 'failed');
    setLoading(false);
  }, [api, enabled, studentId]);

  const hadOverview = !!overview;
  useFocusEffect(
    useCallback(() => {
      if (options.onlyIfMissing && hadOverview) {
        setLoading(false);
        return;
      }
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, enabled]),
  );

  return {
    overview,
    seenCertificateIds: entry?.seenCertificateIds ?? null,
    loading,
    error,
    unsupported,
    isStale: isStale && !!overview,
    refresh,
  };
}
