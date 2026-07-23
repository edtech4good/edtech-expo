// Module-scoped (not redux) flag for the dev-only theme pill. Once a
// developer has manually toggled the theme via DevThemeToggle, both the
// login-time claim dispatch (useAuth) and the start-time branding refresh
// (useBrandingRefresh) skip setting the theme, so the manual choice sticks
// for the rest of the app session. This only ever matters in __DEV__ builds:
// the pill doesn't render in production, so the flag never gets set there
// and the server-derived theme always wins.
let devPillTouched = false;

export function setDevPillTouched(): void {
  devPillTouched = true;
}

export function isDevPillTouched(): boolean {
  return devPillTouched;
}
