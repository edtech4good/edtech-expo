import type { MascotCharacter, WiredClip } from './mascot';

/**
 * Web loader: fetches the JSON from `public/mascots/` at run time, so none of
 * the ~700 KB is in the app bundle and only the one clip shown is downloaded.
 * (The JSON is fetched rather than `import()`ed so it never enters a bundle.
 * The Lottie player itself is a lazy `import()` chunk: see
 * ResultIllustration.web.tsx and MascotPlayer.web.tsx.)
 */
export async function loadMascot(character: MascotCharacter, clip: WiredClip): Promise<object> {
  const res = await fetch(`/mascots/${character}-${clip}.json`);
  if (!res.ok) throw new Error(`mascot ${character}-${clip}: HTTP ${res.status}`);
  return res.json();
}

/** Web plays the JSON with @lottiefiles/react-lottie-player (a dependency). */
export function mascotPlayable(): boolean {
  return true;
}
