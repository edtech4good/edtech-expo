import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';

import {
  Announcer,
  AnnouncerPlatform,
  createAnnouncer,
  INITIAL_REGION_TEXT,
  needsRegion,
} from './announcerLogic';

const AnnouncerContext = createContext<Announcer | null>(null);

const platform: AnnouncerPlatform =
  Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';

/**
 * Hosts spoken announcements for a screen. Mount it ONCE per screen, above
 * anything that announces (the result strip, a move announcement): on the web
 * it renders an always-mounted, initially empty polite live region and fills
 * it after mount; on iOS and Android it renders nothing extra and announces
 * through AccessibilityInfo only.
 *
 * ResultStrip mounts its own if no provider is above it, so it works alone,
 * but then the region is created with the strip, which is what to avoid on a
 * real screen.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState(INITIAL_REGION_TEXT);
  const announcer = useMemo(
    () =>
      createAnnouncer({
        platform,
        announceNative: t => AccessibilityInfo.announceForAccessibility(t),
        setRegionText: setText,
        schedule: (fn, ms) => setTimeout(fn, ms),
        cancel: h => clearTimeout(h as ReturnType<typeof setTimeout>),
      }),
    [],
  );
  const ref = useRef(announcer);
  useEffect(() => () => ref.current.dispose(), []);

  return (
    <AnnouncerContext.Provider value={announcer}>
      {children}
      {needsRegion(platform) ? (
        <View pointerEvents="none" style={styles.region}>
          <Text
            testID="announcer-region"
            // rn-web maps `role` to the DOM attribute; aria-live makes it polite.
            {...({ role: 'status', 'aria-live': 'polite', 'aria-atomic': true } as object)}>
            {text}
          </Text>
        </View>
      ) : null}
    </AnnouncerContext.Provider>
  );
}

/** The screen's announcer, or null when there is no AnnouncerProvider above. */
export function useAnnouncer(): Announcer | null {
  return useContext(AnnouncerContext);
}

const styles = StyleSheet.create({
  // Visually hidden but still in the accessibility tree.
  region: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0.01,
  },
});
