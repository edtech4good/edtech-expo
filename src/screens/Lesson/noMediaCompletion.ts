/**
 * When a video that fails to play may count as "no playable media" and post the
 * one-shot completion (rpi-api#42), and when it may not (edtech-expo#143).
 *
 * A learning item with no media (an empty source, or a file that fails to load
 * at all) earns its points on open. A player that HAS played and then fails is
 * something else: the full-screen switch remounts the player, and a network
 * drop at that moment fails the reload. That is not "no media", and posting a
 * completion would mark the lesson watched when it was not.
 */

/**
 * True when this status says real media is loaded. Not just `isLoaded`: on the
 * web expo-av reports isLoaded as soon as the <video> element exists, before
 * any data or error, so a duration is what says the media really arrived.
 */
export function hasLoadedMedia(status: {
  isLoaded?: boolean;
  durationMillis?: number;
}): boolean {
  return (
    !!status.isLoaded &&
    typeof status.durationMillis === 'number' &&
    Number.isFinite(status.durationMillis) &&
    status.durationMillis > 0
  );
}

export function mayPostNoMediaCompletion(state: {
  everLoaded: boolean;
  alreadyPosted: boolean;
}): boolean {
  return !state.everLoaded && !state.alreadyPosted;
}
