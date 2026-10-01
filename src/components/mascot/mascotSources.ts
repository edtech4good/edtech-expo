import type { MascotCharacter, MascotClip } from './mascotLogic';

/**
 * Native loaders for the Lottie JSON. The six files live in `public/mascots/`
 * (about 700 KB; one copy, shared with the web build, which fetches them at
 * run time: see mascotSources.web.ts). Here each is a `require` inside a
 * function, so a file is only evaluated when its screen is shown. The two
 * `idle` clips are listed too (Metro still bundles every required file, about
 * 186 KB more in the native bundle: the owner accepted that for idle).
 */
const LOADERS: Record<`${MascotCharacter}-${MascotClip}`, () => object> = {
  'bear-pass': () => require('../../../public/mascots/bear-pass.json'),
  'bear-try-again': () => require('../../../public/mascots/bear-try-again.json'),
  'bear-idle': () => require('../../../public/mascots/bear-idle.json'),
  'rabbit-pass': () => require('../../../public/mascots/rabbit-pass.json'),
  'rabbit-try-again': () => require('../../../public/mascots/rabbit-try-again.json'),
  'rabbit-idle': () => require('../../../public/mascots/rabbit-idle.json'),
};

export function loadMascot(character: MascotCharacter, clip: MascotClip): Promise<object> {
  return Promise.resolve().then(() => LOADERS[`${character}-${clip}`]());
}

/** Native: lottie-react-native plays the JSON itself. */
export function mascotPlayable(): boolean {
  return true;
}
