// Pure rules for spoken announcements (no react-native imports).
//
// Native (iOS and Android): one call to the platform's announce API and
// nothing else. A live region on top of it double-announces on Android.
//
// Web: react-native-web's announceForAccessibility does nothing, and a live
// region that is mounted already holding its text is often not read. So the
// host keeps an always-mounted, initially empty polite region, and an
// announcement clears it and then fills it a moment later (the clear makes
// the same words announce again).

export type AnnouncerPlatform = 'web' | 'ios' | 'android';

/** What the web region holds before anything has been announced. */
export const INITIAL_REGION_TEXT = '';

/** Gap between clearing the region and filling it, in ms. */
export const REGION_FILL_DELAY_MS = 60;

export interface AnnouncerDeps {
  platform: AnnouncerPlatform;
  /** AccessibilityInfo.announceForAccessibility. */
  announceNative: (text: string) => void;
  /** Sets the text of the always-mounted web region. */
  setRegionText: (text: string) => void;
  /** setTimeout, injectable for tests. */
  schedule: (fn: () => void, ms: number) => unknown;
  cancel: (handle: unknown) => void;
}

export interface Announcer {
  announce: (text: string) => void;
  dispose: () => void;
}

export function createAnnouncer(deps: AnnouncerDeps): Announcer {
  let pending: unknown = null;
  return {
    announce(text) {
      if (!text) return;
      if (deps.platform !== 'web') {
        deps.announceNative(text);
        return;
      }
      if (pending !== null) deps.cancel(pending);
      deps.setRegionText('');
      pending = deps.schedule(() => {
        pending = null;
        deps.setRegionText(text);
      }, REGION_FILL_DELAY_MS);
    },
    dispose() {
      if (pending !== null) deps.cancel(pending);
      pending = null;
    },
  };
}

/** Only the web needs a region in the tree. */
export function needsRegion(platform: AnnouncerPlatform): boolean {
  return platform === 'web';
}
