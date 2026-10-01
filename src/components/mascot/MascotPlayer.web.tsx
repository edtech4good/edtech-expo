import { Player } from '@lottiefiles/react-lottie-player';

/**
 * The only file that imports the Lottie player (and with it lottie-web, about
 * 330 KB). Mascot.web.tsx loads it with React.lazy, so it is a separate chunk,
 * fetched only when a screen shows a mascot.
 */
export interface MascotPlayerProps {
  source: object;
  width: number;
  height: number;
  autoPlay: boolean;
  loop: boolean;
  /** Fraction (0..1) of the clip to hold when not playing. */
  staticProgress: number | undefined;
}

export default function MascotPlayer({
  source,
  width,
  height,
  autoPlay,
  loop,
  staticProgress,
}: MascotPlayerProps) {
  return (
    <Player
      src={source}
      autoplay={autoPlay}
      loop={loop}
      // Without this the player seeks back to frame 0 when a play-once clip
      // ends (react-lottie-player 3.6.0 `complete` handler), losing the final pose.
      keepLastFrame
      style={{ width, height }}
      // Not playing (reduced motion): jump to one still frame and hold it.
      lottieRef={anim => {
        if (!autoPlay && anim && staticProgress !== undefined)
          anim.goToAndStop(Math.round(Math.max(anim.totalFrames - 1, 0) * staticProgress), true);
      }}
    />
  );
}
