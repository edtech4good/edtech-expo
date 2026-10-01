import type { MascotCharacter, WiredClip } from './mascot';

/**
 * Native loaders for the Lottie JSON. The six files live in `public/mascots/`
 * (about 700 KB; one copy, shared with the web build, which fetches them at
 * run time: see mascotSources.web.ts). Here each is a `require` inside a
 * function, so a file is only evaluated when its screen is shown. The `idle`
 * clips are deliberately NOT listed: a build-time `require` would pull them
 * (about 186 KB) into the native bundle. Add them here with the idle follow-up.
 */
const LOADERS: Record<`${MascotCharacter}-${WiredClip}`, () => object> = {
  'bear-pass': () => require('../../../public/mascots/bear-pass.json'),
  'bear-try-again': () => require('../../../public/mascots/bear-try-again.json'),
  'rabbit-pass': () => require('../../../public/mascots/rabbit-pass.json'),
  'rabbit-try-again': () => require('../../../public/mascots/rabbit-try-again.json'),
};

export function loadMascot(character: MascotCharacter, clip: WiredClip): Promise<object> {
  return Promise.resolve().then(() => LOADERS[`${character}-${clip}`]());
}

/** Native: lottie-react-native plays the JSON itself. */
export function mascotPlayable(): boolean {
  return true;
}
