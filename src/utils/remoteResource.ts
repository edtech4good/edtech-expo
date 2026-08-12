import { Platform } from 'react-native';

/**
 * Resolves a remote resource URL by filename convention, mirroring only the
 * REMOTE branch of `useResource` (src/services/hooks/useResource.ts).
 *
 * `useResource` is a hook and cannot be called per-item inside a `.map()`
 * (e.g. once per curriculum card in a grid), so this plain function exists
 * to provide the same URL-joining logic outside of React's render/hook
 * rules. Offline/native local-file resolution is intentionally out of
 * scope here — callers on that path should keep using `useResource`.
 *
 * @param name Resource filename, e.g. `curriculum-123.jpg`.
 * @returns The joined remote URL, or `null` when `name` is empty, either
 *   env var is missing, or the platform/access-type condition for remote
 *   resolution isn't met.
 */
export function getRemoteResourceUrl(name: string): string | null {
  if (!name) return null;

  const remoteResourcePath = process.env.EXPO_PUBLIC_RESOURCE_URL;
  const folderPath = process.env.EXPO_PUBLIC_RESOURCE_PATH;
  if (!remoteResourcePath || !folderPath) return null;

  const isRemote =
    Platform.OS === 'web' || process.env.EXPO_PUBLIC_ACCESS_TYPE === 'online';
  if (!isRemote) return null;

  return `${remoteResourcePath}/${folderPath}/${name}`;
}
