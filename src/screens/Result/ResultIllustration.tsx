import { View } from 'react-native';

import type { ResultBand } from './resultBand';

/**
 * Slot for a per-band illustration above the result headline (the corporate
 * mascot animations Jesse is making). TODAY IT RENDERS NOTHING and reserves
 * no space, so the screen looks exactly as briefed without it.
 *
 * To plug an animation in, with no layout change:
 *   1. Add a Lottie JSON per band, e.g. `src/assets/lottie/result-passed.json`.
 *   2. Put each in ILLUSTRATIONS below, `require`d, e.g.
 *        passed: require('@/assets/lottie/result-passed.json')
 *      A band left `null` still renders nothing and reserves no space.
 *   3. Nothing else: the slot sizes itself (ILLUSTRATION_SIZE square, centred,
 *      with a gap under it) only for a band that has an asset.
 * `lottie-react-native` is already a dependency; it is required lazily here so
 * the native module is not loaded until an asset exists.
 *
 * Reduced motion: the animation does not autoplay, it shows its LAST frame
 * (`progress={1}`), so the learner sees the finished pose, never movement.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LottieSource = any;

const ILLUSTRATIONS: Record<ResultBand, LottieSource | null> = {
  passed: null,
  close: null,
  far: null,
};

/** Square size of the slot (and the gap under it) when an asset exists. */
export const ILLUSTRATION_SIZE = 160;
const GAP = 16;

/** True when the band has an asset, so the screen knows the slot is live. */
export function hasResultIllustration(band: ResultBand): boolean {
  return ILLUSTRATIONS[band] != null;
}

export interface ResultIllustrationProps {
  band: ResultBand;
  reducedMotion: boolean;
  /** Smaller slot for short landscape screens. */
  compact?: boolean;
}

export default function ResultIllustration({
  band,
  reducedMotion,
  compact = false,
}: ResultIllustrationProps) {
  const source = ILLUSTRATIONS[band];
  if (source == null) return null;

  // Lazy: only reached once an asset has been supplied.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const LottieView = require('lottie-react-native').default;
  const size = compact ? Math.round(ILLUSTRATION_SIZE * 0.7) : ILLUSTRATION_SIZE;

  return (
    <View
      // Decorative: the headline and score carry the meaning.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, marginBottom: GAP, alignSelf: 'center' }}>
      <LottieView
        source={source}
        autoPlay={!reducedMotion}
        loop={false}
        progress={reducedMotion ? 1 : undefined}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
