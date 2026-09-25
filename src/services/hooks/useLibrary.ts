import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import { getLibraryEntry, getProfile, LibraryActions } from '@/redux/slices';
import useConnectivity from './useConnectivity';

/**
 * Library tab data source. Fetches `level/library` (every level the
 * learner has access to, grouped by curriculum → grade) on mount, on
 * focus (as LevelSelectionScreen does for its lesson list), and on
 * reconnect — then persists the result per-user via LibrarySlice so the
 * list still renders offline once it has loaded at least once.
 *
 * Silent on failure: Api's responseTransform throws on a non-ok response
 * (network error, 4xx/5xx), so this always wraps the call in try/catch and
 * simply keeps whatever is already cached in redux rather than surfacing
 * an error UI — the whole point of caching this per-user is that a
 * transient failure (or being offline) should not blank the list. Callers
 * distinguish "still loading, nothing cached yet" from "load failed /
 * offline, nothing cached" via `isLoading` and `isUnavailable` — see below.
 */
export default function useLibrary() {
  const api = useApi();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(getProfile);
  const ownerId = profile?.schooluserid ?? null;
  const entry = useAppSelector(getLibraryEntry(ownerId));
  const { isOffline } = useConnectivity();
  const wasOffline = useRef(isOffline);
  // Start "loading" only when there's nothing cached yet for this user, so
  // a learner with a cached library sees it immediately while this hook
  // refreshes in the background, instead of a loading flash over stale-but-
  // valid data.
  const [isLoading, setIsLoading] = useState(() => !entry);

  const loadLibrary = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!ownerId) {
        // No profile yet: there is nothing to fetch, so don't leave
        // isLoading stuck true waiting for a request that will never fire.
        if (isActive()) setIsLoading(false);
        return;
      }
      if (isActive()) setIsLoading(true);
      try {
        const response = await api.fetchLibrary();
        const data = response.data?.data;
        if (data) {
          // Always dispatch a successful response to redux, even if this
          // screen instance lost focus (or unmounted) mid-request — the
          // fetch already happened, and dropping the result here would
          // just mean redoing the same network call on the next focus.
          // Only the *local* isLoading flag is guarded by `isActive`, so a
          // request that outlives this focused instance can't flip its
          // loading state back on after the fact.
          dispatch(
            LibraryActions.updateLibrary({
              ownerId,
              curricula: data.curricula ?? [],
              generatedAt: data.generated_at,
            }),
          );
        }
      } catch {
        // Offline-first: leave whatever is already cached for this user.
      } finally {
        if (isActive()) setIsLoading(false);
      }
    },
    [api, dispatch, ownerId],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadLibrary(() => active);
      return () => {
        active = false;
        // No explicit reset here: if this instance's in-flight request
        // finishes after blur, isLoading is left however loadLibrary's
        // guarded `finally` leaves it (unchanged, since isActive() is now
        // false). That's fine — the next focus calls loadLibrary again,
        // which unconditionally sets isLoading(true) up front and resolves
        // it correctly once that new, active request completes.
      };
    }, [loadLibrary]),
  );

  // Reconnect refresh: catches the case where the screen stays focused
  // across a connectivity drop/restore (focus alone would miss it).
  useEffect(() => {
    if (wasOffline.current && !isOffline) {
      loadLibrary();
    }
    wasOffline.current = isOffline;
  }, [isOffline, loadLibrary]);

  const curricula = entry?.curricula ?? [];
  // True only once a successful response for this user is stored and it
  // came back with zero curricula — never while still loading and never
  // just because nothing has been fetched yet (that's `isUnavailable`).
  const isEmpty = !!entry && entry.curricula.length === 0;
  // Nothing cached, and either the (only) load attempt for it is no longer
  // in flight, or we're offline — an offline learner with nothing cached
  // would otherwise sit on `isLoading` for the full ~120s request timeout
  // instead of seeing the unavailable state immediately.
  const isUnavailable = !entry && (!isLoading || isOffline);

  return {
    curricula,
    isLoading,
    isEmpty,
    isUnavailable,
    // Lets callers (LibraryScreen) tell "loading with nothing cached yet"
    // from "loading a background refresh of an already-cached (possibly
    // empty) library" — only the former should show a spinner.
    hasEntry: !!entry,
    lastUpdated: entry?.generatedAt,
  };
}
