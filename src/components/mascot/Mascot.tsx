import { useState } from 'react';
import { View } from 'react-native';

import {
  MASCOT_ASPECT,
  MascotCharacter,
  MascotClip,
  mascotHeight,
  pickCharacter,
  playConfig,
} from './mascotLogic';
import MascotBoundary from './MascotBoundary';
import useMascotSource from './useMascotSource';
import useReducedMotion from './useReducedMotion';

export interface MascotProps {
  /** `idle` loops; `pass` and `try-again` play once and hold the last frame. */
  clip: MascotClip;
  /** Omit to pick one at random, once per mount (never re-rolled by a re-render). */
  character?: MascotCharacter;
  /** Override the clip's default (idle loops, the others do not). */
  loop?: boolean;
  /** Smaller slot for short landscape screens and empty states. */
  compact?: boolean;
  /**
   * Omit to follow the OS setting. `true`/`null` (not known yet) shows one
   * still frame, no playback.
   */
  reducedMotion?: boolean | null;
  /** Space left below the mascot. Lives inside the slot, so a failed mascot leaves no gap. */
  gapBelow?: number;
}

/**
 * The shared mascot: Jesse's Lottie bear and rabbit, used on the result
 * screen, the quiz intro and corporate empty states. Decorative and hidden
 * from assistive tech: the text around it carries the meaning.
 *
 * Space is reserved from the first render, so nothing jumps when the JSON
 * arrives; if the artwork or the player fails (offline and uncached, chunk
 * blocked, lottie throws) the whole slot, margin included, renders nothing.
 * This file is the native (iOS/Android) renderer; web uses Mascot.web.tsx
 * (@lottiefiles/react-lottie-player).
 */
function MascotInner({
  clip,
  character: characterProp,
  loop,
  compact = false,
  reducedMotion,
  gapBelow = 0,
}: MascotProps) {
  const [picked] = useState(() => characterProp ?? pickCharacter());
  const character = characterProp ?? picked;
  const osReduced = useReducedMotion();
  const reduced = (reducedMotion === undefined ? osReduced : reducedMotion) !== false;
  const { playable, source, failed } = useMascotSource(character, clip);

  if (!playable || failed) return null;

  const height = mascotHeight(compact);
  const width = Math.round(height * MASCOT_ASPECT);
  const cfg = playConfig(reduced, clip, loop);

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
      style={{ width, height, alignSelf: 'center', marginBottom: gapBelow }}>
      {LottieView && (
        <LottieView
          // Fresh player per character/clip so it always starts from frame 0.
          key={`${character}-${clip}-${cfg.autoPlay ? 'play' : 'still'}`}
          source={source}
          autoPlay={cfg.autoPlay}
          loop={cfg.loop}
          progress={cfg.staticProgress}
          style={{ width, height }}
        />
      )}
    </View>
  );
}

export default function Mascot(props: MascotProps) {
  return (
    <MascotBoundary>
      <MascotInner {...props} />
    </MascotBoundary>
  );
}
