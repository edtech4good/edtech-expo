// Installs Metro's async-chunk loader, which the app's custom entry does not
// (expo-router's own entry does). Needed for the lazy import() below.
import '@expo/metro-runtime/async-require';
import { lazy, Suspense, useEffect, useState } from 'react';
import { View } from 'react-native';

import { clipForBand, MASCOT_ASPECT, mascotHeight } from './mascot';
import { loadMascot, mascotPlayable } from './mascotSources';
import type { ResultIllustrationProps } from './ResultIllustration';

/**
 * Web renderer for the mascot slot (see ResultIllustration.tsx for the
 * contract). Uses @lottiefiles/react-lottie-player directly. If the package
 * is ever missing the slot renders nothing and takes no room.
 * Plays once, no loop, and holds the last frame. With reduced motion it does not
 * autoplay and shows the last frame (lottie-web `goToAndStop`), as native does. Decorative: hidden from
 * assistive tech.
 */
// @ts-ignore tsconfig's `module` rejects import(); Metro splits it into its own chunk.
const MascotPlayer = lazy(() => import('./MascotPlayer'));

export const MASCOT_GAP = 16;

export function hasResultIllustration(): boolean {
  return mascotPlayable();
}

export default function ResultIllustration({
  band,
  character,
  reducedMotion,
  compact = false,
}: ResultIllustrationProps) {
  const playable = mascotPlayable();
  const clip = clipForBand(band);
  const [source, setSource] = useState<object | null>(null);

  useEffect(() => {
    if (!playable) return;
    let alive = true;
    loadMascot(character, clip)
      .then(s => alive && setSource(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [playable, character, clip]);

  if (!playable) return null;

  const height = mascotHeight(compact);
  const width = Math.round(height * MASCOT_ASPECT);

  return (
    <View
      accessible={false}
      aria-hidden
      pointerEvents="none"
      style={{ width, height, alignSelf: 'center' }}>
      {source && (
        <Suspense fallback={null}>
          <MascotPlayer
            key={`${character}-${clip}-${reducedMotion ? 'still' : 'play'}`}
            source={source}
            width={width}
            height={height}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      )}
    </View>
  );
}
