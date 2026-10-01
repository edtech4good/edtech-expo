import type { MascotCharacter, MascotClip } from './mascot';

/**
 * Web loader: fetches the JSON from `public/mascots/` at run time, so none of
 * the ~700 KB is in the app bundle and only the one clip shown is downloaded.
 * (Expo SDK 50 web does not load Metro's async `import()` chunks, so a dynamic
 * import of the JSON fails.)
 */
export async function loadMascot(character: MascotCharacter, clip: MascotClip): Promise<object> {
  const res = await fetch(`/mascots/${character}-${clip}.json`);
  if (!res.ok) throw new Error(`mascot ${character}-${clip}: HTTP ${res.status}`);
  return res.json();
}

/** Web plays the JSON with @lottiefiles/react-lottie-player (a dependency). */
export function mascotPlayable(): boolean {
  return true;
}
