import { Player } from '@lottiefiles/react-lottie-player';

/**
 * The only file that imports the Lottie player (and with it lottie-web, about
 * 330 KB). ResultIllustration.web.tsx loads it with React.lazy, so it is a
 * separate chunk, fetched only when a result screen shows a mascot.
 */
export interface MascotPlayerProps {
  source: object;
  width: number;
  height: number;
  reducedMotion: boolean;
}

export default function MascotPlayer({ source, width, height, reducedMotion }: MascotPlayerProps) {
  return (
    <Player
      src={source}
      autoplay={!reducedMotion}
      loop={false}
      // Without this the player seeks back to frame 0 when the clip ends
      // (react-lottie-player 3.6.0 `complete` handler), losing the final pose.
      keepLastFrame
      style={{ width, height }}
      // Reduced motion: no playback; jump to the last frame and hold it.
      lottieRef={anim => {
        if (reducedMotion && anim) anim.goToAndStop(Math.max(anim.totalFrames - 1, 0), true);
      }}
    />
  );
}
