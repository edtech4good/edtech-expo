/**
 * Access-mode predicate for the two ways this app is deployed:
 *
 * - "online": the MIV/DCRS phone app (`EXPO_PUBLIC_ACCESS_TYPE=online`, see
 *   eas.json / .env). It talks to cloud APIs only and has no local content
 *   directory — it must never touch Android's Storage Access Framework.
 * - offline (default / unset): the Raspberry-Pi kiosk mode, where content is
 *   read from a directory the user grants via SAF.
 *
 * Mirrors the shape of the existing online-mode check in
 * src/utils/remoteResource.ts (`Platform.OS === 'web' || EXPO_PUBLIC_ACCESS_TYPE === 'online'`),
 * but scoped to just the access-type half — SAF is meaningless on web
 * regardless of access type, so callers that need the web case too should
 * check `Platform.OS === 'web'` separately.
 */
export const isOnlineOnly = () =>
  process.env.EXPO_PUBLIC_ACCESS_TYPE === 'online';
