import { Platform } from 'react-native';

import type { MascotCharacter, MascotClip } from './mascot';

/**
 * Lazy loaders for the Lottie JSON (about 700 KB for all six). Each is a
 * dynamic import so the result screen's artwork is not parsed at app start,
 * and where the bundler splits async imports it stays out of the main bundle.
 * `idle` is shipped but deliberately not wired here.
 */
const LOADERS: Record<`${MascotCharacter}-${MascotClip}`, () => Promise<{ default: object }>> = {
  'bear-pass': () =>
    // @ts-ignore tsconfig's `module` rejects import(); Metro handles it.
    import('../../assets/mascots/bear-pass.json'),
  'bear-try-again': () =>
    // @ts-ignore tsconfig's `module` rejects import(); Metro handles it.
    import('../../assets/mascots/bear-try-again.json'),
  'bear-idle': () =>
    // @ts-ignore tsconfig's `module` rejects import(); Metro handles it.
    import('../../assets/mascots/bear-idle.json'),
  'rabbit-pass': () =>
    // @ts-ignore tsconfig's `module` rejects import(); Metro handles it.
    import('../../assets/mascots/rabbit-pass.json'),
  'rabbit-try-again': () =>
    // @ts-ignore tsconfig's `module` rejects import(); Metro handles it.
    import('../../assets/mascots/rabbit-try-again.json'),
  'rabbit-idle': () =>
    // @ts-ignore tsconfig's `module` rejects import(); Metro handles it.
    import('../../assets/mascots/rabbit-idle.json'),
};

export function loadMascot(character: MascotCharacter, clip: MascotClip): Promise<object> {
  return LOADERS[`${character}-${clip}`]().then(m => m.default ?? (m as unknown as object));
}

/**
 * On native, lottie-react-native plays the JSON itself. On web it throws unless
 * `@lottiefiles/react-lottie-player` is installed, so the slot must stay empty
 * there until that package is a dependency (it is not today).
 */
export function mascotPlayable(): boolean {
  if (Platform.OS !== 'web') return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return Boolean(require('@lottiefiles/react-lottie-player'));
  } catch {
    return false;
  }
}
