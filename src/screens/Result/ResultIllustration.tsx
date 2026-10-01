import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import {
  clipForBand,
  MASCOT_ASPECT,
  MascotCharacter,
  mascotHeight,
  playConfig,
} from './mascot';
import { loadMascot, mascotPlayable } from './mascotSources';
import type { ResultBand } from './resultBand';

/**
 * Jesse's mascot animation above the result headline. One character per
 * result screen (picked by the caller, once per mount); a pass plays
 * `*-pass`, close and far play `*-try-again`. It plays once, no loop, and
 * holds the last frame. With reduced motion it does not autoplay and shows
 * the last frame. It is decorative and hidden from assistive tech: the
 * headline carries the result.
 *
 * Space is reserved from the first render (so nothing jumps when the JSON
 * arrives), but only where the slot can actually play (see mascotPlayable):
 * on web that needs @lottiefiles/react-lottie-player, which is not installed,
 * so the slot stays empty and takes no room there.
 */
export const MASCOT_GAP = 16;

/** True when the slot will draw something, so the screen can lay out around it. */
export function hasResultIllustration(): boolean {
  return mascotPlayable();
}

export interface ResultIllustrationProps {
  band: ResultBand;
  character: MascotCharacter;
  reducedMotion: boolean;
  /** Smaller slot for short landscape screens. */
  compact?: boolean;
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
      .catch(() => {}); // no artwork is not an error worth a crash
    return () => {
      alive = false;
    };
  }, [playable, character, clip]);

  // Web cannot show a held frame (lottie web has no `progress`), so with
  // reduced motion it shows nothing rather than a stray first frame.
  if (!playable || (Platform.OS === 'web' && reducedMotion)) return null;

  const height = mascotHeight(compact);
  const width = Math.round(height * MASCOT_ASPECT);
  const cfg = playConfig(reducedMotion !== false);

  // Lazy: the native module is not touched until there is something to show.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const LottieView = source ? require('lottie-react-native').default : null;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      aria-hidden
      pointerEvents="none"
      style={{ width, height, alignSelf: 'center' }}>
      {LottieView && (
        <LottieView
          // Fresh player per character/clip so it always starts from frame 0.
          key={`${character}-${clip}-${cfg.autoPlay ? 'play' : 'still'}`}
          source={source}
          autoPlay={cfg.autoPlay}
          loop={cfg.loop}
          progress={cfg.staticProgress}
          webStyle={{ width, height }}
          style={{ width, height }}
        />
      )}
    </View>
  );
}
