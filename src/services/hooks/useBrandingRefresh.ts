import { useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '@/redux';
import {
  getProfile,
  getSelectedTheme,
  SettingActions,
} from '@/redux/slices';
import { isDevPillTouched } from '@/services/devThemeOverride';
import { useApi } from '../api/ApiContext';

// Runs once per mount of the root layout (after redux-persist has
// rehydrated) to refresh the theme + branding from the school's current
// server-side settings. This lets an admin flip a school's theme and have
// it show up next time a device with connectivity starts the app, without
// requiring a fresh login.
//
// Offline is a normal condition here, not an error: if the fetch fails for
// any reason (no network, server down, bad shape) this silently no-ops and
// the persisted theme from the last successful login/refresh stands.
export default function useBrandingRefresh() {
  const dispatch = useAppDispatch();
  const api = useApi();
  const profile = useAppSelector(getProfile);
  const currentTheme = useAppSelector(getSelectedTheme);
  const currentThemeRef = useRef(currentTheme);
  currentThemeRef.current = currentTheme;
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const schoolName = profile?.schoolname;
    if (!schoolName) return;

    (async () => {
      try {
        const response = await api.fetchBranding(schoolName);
        // NOTE: `!response.ok` here only ever covers a 200 that reports
        // `error: true` in its body. Actual transport failures (offline,
        // DNS, timeout, non-2xx) never reach this line as a resolved
        // response — Api's responseTransform throws for those, so they
        // arrive as a rejected promise from `fetchBranding` and are caught
        // by the try/catch below. Do not remove that try/catch on the
        // assumption this `ok` check already covers offline; it doesn't.
        if (!response.ok || !response.data || response.data.error) return;

        const { uitheme, brandingconfig } = response.data.data;

        // The dev pill's manual choice only needs to win for the *theme*;
        // branding metadata (logo/display name) isn't part of what the
        // pill is for, so it stays in sync regardless.
        if (
          !(__DEV__ && isDevPillTouched()) &&
          (uitheme === 'kids' || uitheme === 'corporate') &&
          uitheme !== currentThemeRef.current
        ) {
          dispatch(SettingActions.changeThemeAction(uitheme));
        }

        dispatch(SettingActions.setBrandingAction(brandingconfig ?? null));
      } catch {
        // Offline or server error — persisted theme stands, no-op.
      }
    })();
    // Runs once per mount only; intentionally not re-running on profile
    // or theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
