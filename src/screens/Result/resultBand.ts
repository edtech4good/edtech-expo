import { PASS_PERCENTAGE } from '../../constants/progress';

/**
 * Which encouraging message the corporate result screen shows.
 *
 *  - `passed`: at or above the pass mark (PASS_PERCENTAGE, 80).
 *  - `close`: not passed, but within CLOSE_MARGIN points of it (60 up to
 *    but not including 80).
 *  - `far`: anything lower.
 *
 * Presentation only. Whether the learner passed is still decided by
 * useResult (`percentage >= PASS_PERCENTAGE`); this reads that verdict and
 * never recomputes it.
 */
export type ResultBand = 'passed' | 'close' | 'far';

/** How many points under the pass mark still counts as "so close". */
export const CLOSE_MARGIN = 20;

export function resultBand(
  hasPassed: boolean,
  percentage: number,
  passPercentage: number = PASS_PERCENTAGE,
  closeMargin: number = CLOSE_MARGIN,
): ResultBand {
  if (hasPassed) return 'passed';
  return percentage >= passPercentage - closeMargin ? 'close' : 'far';
}
