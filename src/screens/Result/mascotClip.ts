import type { MascotClip } from '@/components/mascot/mascotLogic';
import type { ResultBand } from './resultBand';

/**
 * Jesse's mapping: a pass plays `*-pass`; "close" and "far" both play
 * `*-try-again`.
 */
export function clipForBand(band: ResultBand): Exclude<MascotClip, 'idle'> {
  return band === 'passed' ? 'pass' : 'try-again';
}
