import { NavigationContext } from '@react-navigation/native';
import { useCallback, useContext, useEffect, useState } from 'react';

import {
  audioManager,
  ClipSource,
  ClipState,
} from './audioManager';

/**
 * State and controls for one clip on the shared player.
 *
 * - `source` comes from `useResource` (a URI) or is a bundled asset; an
 *   empty string means the clip does not exist and `available` is false.
 * - Playing another clip stops this one (the manager holds one player).
 * - On unmount, and when the screen holding it loses focus, a clip that is
 *   playing is stopped and unloaded.
 * - Nothing here touches the network itself: the URI is whatever
 *   `useResource` resolved (a cached file when offline).
 */
export function useAudioClip(id: string, source: ClipSource | undefined) {
  const [state, setState] = useState<ClipState>(() => audioManager.getState(id));
  const available = typeof source === 'number' || (typeof source === 'string' && source !== '');
  // Undefined outside a navigator (the kit's own tests, a dev harness).
  const navigation = useContext(NavigationContext);

  useEffect(() => {
    setState(audioManager.getState(id));
    const unsubscribe = audioManager.subscribe(id, setState);
    return () => {
      unsubscribe();
      void audioManager.release(id);
    };
  }, [id]);

  useEffect(() => {
    if (!navigation) return undefined;
    return navigation.addListener('blur', () => {
      void audioManager.release(id);
    });
  }, [navigation, id]);

  const toggle = useCallback(() => {
    if (!available) return;
    const current = audioManager.getState(id);
    if (current.status === 'playing' || current.status === 'loading') {
      void audioManager.stop();
      return;
    }
    audioManager.clearError(id);
    void audioManager.play(id, source as ClipSource);
  }, [id, source, available]);

  return { state, available, toggle } as const;
}
