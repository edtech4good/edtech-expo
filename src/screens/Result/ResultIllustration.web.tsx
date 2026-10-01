import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { clipForBand, MASCOT_ASPECT, mascotHeight } from './mascot';
import { loadMascot, mascotPlayable } from './mascotSources';
import type { ResultIllustrationProps } from './ResultIllustration';

/**
 * Web renderer for the mascot slot (see ResultIllustration.tsx for the
 * contract). Uses @lottiefiles/react-lottie-player directly: it is not a
 * dependency today, so without it the slot renders nothing and takes no room.
 * Plays once, no loop, and holds the last frame. With reduced motion nothing
 * is shown (the player cannot hold a chosen frame). Decorative: hidden from
 * assistive tech.
 */
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

  if (!playable || reducedMotion) return null;

  const height = mascotHeight(compact);
  const width = Math.round(height * MASCOT_ASPECT);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Player = source ? require('@lottiefiles/react-lottie-player').Player : null;

  return (
    <View
      accessible={false}
      aria-hidden
      pointerEvents="none"
      style={{ width, height, alignSelf: 'center' }}>
      {Player && (
        <Player
          key={`${character}-${clip}`}
          src={source}
          autoplay
          loop={false}
          style={{ width, height }}
        />
      )}
    </View>
  );
}
