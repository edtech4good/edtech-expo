import { useEffect, useState } from 'react';

import type { MascotCharacter, MascotClip } from './mascotLogic';
import { loadMascot, mascotPlayable } from './mascotSources';

/**
 * Loads the Lottie JSON for one character and clip. `failed` turns true if the
 * artwork cannot be fetched or parsed (offline with an uncached file, blocked,
 * 404), so the caller can render nothing instead of an empty reserved box.
 */
export default function useMascotSource(character: MascotCharacter, clip: MascotClip) {
  const playable = mascotPlayable();
  const [source, setSource] = useState<object | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!playable) return;
    let alive = true;
    setSource(null);
    setFailed(false);
    loadMascot(character, clip)
      .then(s => alive && setSource(s))
      .catch(() => alive && setFailed(true)); // no artwork is not an error worth a crash
    return () => {
      alive = false;
    };
  }, [playable, character, clip]);

  return { playable, source, failed };
}
