import { NavigationContext } from '@react-navigation/native';
import { useCallback, useContext, useEffect, useId } from 'react';

import { audioManager, ClipSource } from './audioManager';

/**
 * A "play from the start" control on the shared player, for the older
 * (kids-theme) audio buttons that always restart their clip on a tap.
 *
 * Unlike `useAudioClip` it does not subscribe to the clip's state, so the
 * button does not re-render while the clip plays: those buttons show no
 * playing state. What it shares with `useAudioClip` is the one rule that
 * matters: the app has one player, so starting this clip stops any other
 * (the question's heading audio, another option, a Listen pill).
 *
 * - `source` is a URI from `useResource` ('' or undefined: no clip).
 * - On unmount, and when the screen loses focus, a clip this control
 *   started is stopped and unloaded.
 * - `prefix` only makes the id readable in logs; every instance gets its own
 *   id, so two buttons for the same file never release each other's clip.
 */
export function useReplayClip(prefix: string, source: ClipSource | undefined) {
  const reactId = useId();
  const id = `${prefix}-${reactId}`;
  const available =
    typeof source === 'number' || (typeof source === 'string' && source !== '');
  // Undefined outside a navigator (tests, a dev harness).
  const navigation = useContext(NavigationContext);

  useEffect(
    () => () => {
      void audioManager.release(id);
    },
    [id],
  );

  useEffect(() => {
    if (!navigation) return undefined;
    return navigation.addListener('blur', () => {
      void audioManager.release(id);
    });
  }, [navigation, id]);

  const play = useCallback(() => {
    if (!available) return Promise.resolve();
    return audioManager.play(id, source as ClipSource);
  }, [id, source, available]);

  return { id, available, play } as const;
}
