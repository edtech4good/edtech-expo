/**
 * What the lesson saves when it unmounts (progress, "watched", duration), as a
 * pure function so the guard can be tested (edtech-expo#143).
 *
 * The rules are the screen's own, unchanged: nothing is saved under 5 s of
 * progress; "ended" is within 5 s of the end. The addition is the duration
 * guard. After a network drop and a full-screen switch the web player reports
 * `isLoaded` with a NaN duration; saving that posts `content_length: null` and
 * the API answers 400, so the learner's progress is lost. A usable duration is
 * a finite number above zero: use the last good one, or save nothing if the
 * player never had one.
 */
export interface UnmountSave {
  progress: number;
  hasEnded: boolean;
  duration: number;
}

const usable = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

export function planUnmountSave(input: {
  positionMillis: unknown;
  durationMillis: unknown;
  lastGoodDuration: number | null;
}): UnmountSave | null {
  const { positionMillis, durationMillis, lastGoodDuration } = input;
  if (typeof positionMillis !== 'number' || !Number.isFinite(positionMillis))
    return null;
  if (positionMillis < 5000) return null;
  const duration = usable(durationMillis)
    ? durationMillis
    : usable(lastGoodDuration)
    ? lastGoodDuration
    : null;
  if (duration === null) return null;
  return {
    progress: positionMillis,
    hasEnded: positionMillis > duration - 5000,
    duration,
  };
}
