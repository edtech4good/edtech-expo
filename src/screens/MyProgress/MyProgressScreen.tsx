import { useAuth, useProgressSummary } from '@/services';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';
import MyProgressSection, {
  myProgressVariantFor,
} from './Components/MyProgressSection';

// Desktop content padding (handoff Desktop 1440x900: 36 vertical / 48
// horizontal).
const DESKTOP_PADDING_V = 36;
const DESKTOP_PADDING_H = 48;

/**
 * Corporate "My progress" page (its own route, app/(app)/(home)/progress —
 * not part of Profile). Reached from the phone tab bar, the tablet NavRail
 * and the desktop NavSidebar; the kids drawer has no entry for it.
 *
 * A ScrollView rather than LayoutScrollView + Container: Container pins
 * itself to the window height, and "View all" can grow the curriculum list
 * past it.
 */
export default function MyProgressScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const { summary, loading, error, isStale, refresh } = useProgressSummary();

  const variant = myProgressVariantFor(width, theme.breakpoints);
  const isDesktop = variant === 'desktop';
  const padH = isDesktop
    ? DESKTOP_PADDING_H
    : theme.layouts.pageHorizontalPadding;
  const padV = isDesktop
    ? DESKTOP_PADDING_V
    : theme.layouts.pageVerticalPadding;

  const studentName = `${profile?.studentfirstname ?? ''} ${
    profile?.studentlastname ?? ''
  }`.trim();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingHorizontal: padH,
        paddingVertical: padV,
      }}>
      <MyProgressSection
        summary={summary}
        loading={loading}
        error={error}
        isStale={isStale}
        onRetry={refresh}
        studentName={studentName}
        variant={variant}
      />
    </ScrollView>
  );
}
