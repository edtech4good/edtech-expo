import type { ResultBand } from './resultBand';

/**
 * Pure choices for the result-screen mascot: which character, which file,
 * how it plays. No React, no assets (the JSON loads in mascotSources.ts) so
 * it can be tested on its own.
 */
export type MascotCharacter = 'bear' | 'rabbit';
export type MascotClip = 'pass' | 'try-again' | 'idle';

export const MASCOT_CHARACTERS: readonly MascotCharacter[] = ['bear', 'rabbit'];

/**
 * Jesse's mapping: a pass plays `*-pass`; "close" and "far" both play
 * `*-try-again`. `idle` is delivered but unused here (a follow-up places it).
 */
export function clipForBand(band: ResultBand): MascotClip {
  return band === 'passed' ? 'pass' : 'try-again';
}

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
  /** Fraction to show when not playing: 1 = the last (finished) frame. */
  staticProgress: number | undefined;
}

/**
 * Play once, never loop, and hold the last frame (Lottie holds it on finish).
 * Reduced motion: do not autoplay; show the last frame.
 */
export function playConfig(reducedMotion: boolean): MascotPlayConfig {
  return reducedMotion
    ? { autoPlay: false, loop: false, staticProgress: 1 }
    : { autoPlay: true, loop: false, staticProgress: undefined };
}

/** Height of the mascot: about 180 on phones and wide screens, smaller when compact. */
export function mascotHeight(compact: boolean): number {
  return compact ? 120 : 180;
}
