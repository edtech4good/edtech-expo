/**
 * Which presentation of the corporate result screen ships.
 *
 *  - `A` "calm": encouraging copy and an animated ring fill.
 *  - `B` "a little playful": A plus, on a pass, a brief burst of small
 *    token-coloured shapes round the ring and a gentle bounce on the headline.
 *
 * Commit the default below. In a dev build on web, `?resultVariant=B` on the
 * URL the app was first loaded with previews the other one (read once at
 * load, so it survives in-app navigation). It is a no-op in release builds.
 */
export type ResultVariant = 'A' | 'B';

export const DEFAULT_RESULT_VARIANT: ResultVariant = 'A';

function readOverride(): ResultVariant | null {
  try {
    if (
      typeof __DEV__ !== 'undefined' &&
      __DEV__ &&
      typeof window !== 'undefined' &&
      window.location &&
      typeof window.location.search === 'string'
    ) {
      const v = new URLSearchParams(window.location.search).get('resultVariant');
      if (v === 'A' || v === 'B') return v;
    }
  } catch {
    // no window, no override
  }
  return null;
}

export const RESULT_VARIANT: ResultVariant =
  readOverride() ?? DEFAULT_RESULT_VARIANT;
