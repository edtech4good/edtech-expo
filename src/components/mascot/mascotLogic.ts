/**
 * Pure choices for the shared mascot (result screen, quiz intro, empty
 * states): which character, which file, how it plays. No React, no assets
 * (the JSON loads in mascotSources.ts) so it can be tested on its own.
 */
export type MascotCharacter = 'bear' | 'rabbit';
/** `try-again` matches the artwork file names (`bear-try-again.json`). */
export type MascotClip = 'pass' | 'try-again' | 'idle';

export const MASCOT_CHARACTERS: readonly MascotCharacter[] = ['bear', 'rabbit'];

export function mascotFile(character: MascotCharacter, clip: MascotClip): string {
  return `${character}-${clip}.json`;
}

/** `rand` is Math.random-shaped (0 <= r < 1); inject a seeded one in tests. */
export function pickCharacter(rand: () => number = Math.random): MascotCharacter {
  const i = Math.floor(rand() * MASCOT_CHARACTERS.length);
  return MASCOT_CHARACTERS[Math.min(Math.max(i, 0), MASCOT_CHARACTERS.length - 1)];
}

/** Artwork is 600x800 (3:4). */
export const MASCOT_ASPECT = 600 / 800;

export interface MascotPlayConfig {
  autoPlay: boolean;
  loop: boolean;
  /** Fraction (0..1) to show when not playing. */
  staticProgress: number | undefined;
}

/** The still frame shown for reduced motion: idle rests on its first (neutral) frame. */
export const IDLE_STILL_PROGRESS = 0;

/**
 * `pass` and `try-again` play once and hold the last frame; `idle` loops.
 * `loop` overrides that default. Reduced motion never autoplays and never
 * loops: it shows one still frame (the last for pass/try-again, the first for
 * idle).
 */
export function playConfig(
  reducedMotion: boolean,
  clip: MascotClip = 'pass',
  loop: boolean = clip === 'idle',
): MascotPlayConfig {
  if (reducedMotion) {
    return {
      autoPlay: false,
      loop: false,
      staticProgress: clip === 'idle' ? IDLE_STILL_PROGRESS : 1,
    };
  }
  return { autoPlay: true, loop, staticProgress: undefined };
}

/** Height of the mascot: about 180 on phones and wide screens, smaller when compact. */
export function mascotHeight(compact: boolean): number {
  return compact ? 120 : 180;
}
