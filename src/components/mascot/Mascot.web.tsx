// Installs Metro's async-chunk loader, which the app's custom entry does not
// (expo-router's own entry does). Needed for the lazy import() below.
import '@expo/metro-runtime/async-require';
import { lazy, Suspense, useState } from 'react';
import { View } from 'react-native';

import type { MascotProps } from './Mascot';
import { MASCOT_ASPECT, mascotHeight, pickCharacter, playConfig } from './mascotLogic';
import MascotBoundary from './MascotBoundary';
import useMascotSource from './useMascotSource';
import useReducedMotion from './useReducedMotion';

/**
 * Web renderer for the shared mascot (see Mascot.tsx for the contract). Uses
 * @lottiefiles/react-lottie-player directly. Reduced motion: no playback, one
 * still frame (lottie-web `goToAndStop`), as native does. Decorative: hidden
 * from assistive tech.
 */
// Production: its own chunk (@ts-ignore: tsconfig's `module` rejects import()).
// Dev: required synchronously. Metro's dev async loader ends in
// HMRClient.registerBundle(), which throws "Expected HMRClient.setup() call at
// startup" because this app's custom entry (index.js) never runs
// @expo/metro-runtime's HMR setup (only expo-router's entry does).
const MascotPlayer = lazy(
  process.env.NODE_ENV === 'production'
    ? // @ts-ignore
      () => import('./MascotPlayer')
    : () => Promise.resolve(require('./MascotPlayer')),
);

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

  return (
    <View
      accessible={false}
      aria-hidden
      pointerEvents="none"
      style={{ width, height, alignSelf: 'center', marginBottom: gapBelow }}>
      {source && (
        <Suspense fallback={null}>
          <MascotPlayer
            key={`${character}-${clip}-${reduced ? 'still' : 'play'}`}
            source={source}
            width={width}
            height={height}
            autoPlay={cfg.autoPlay}
            loop={cfg.loop}
            staticProgress={cfg.staticProgress}
          />
        </Suspense>
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
