import { BackButton, DrawerButton, LearnerBackButton } from '@/components';
import { useAppSelector } from '@/redux';
import { getResourcePath } from '@/redux/slices';
import { useDesign, useFont, useNavShell, useSetting } from '@/services';
import { Stack } from 'expo-router';
import _ from 'lodash';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { useTheme } from 'styled-components/native';

export default function HomeStack() {
  const theme = useTheme();
  const font = useFont('semi');
  const { isCorporate } = useDesign();
  const displayBold = useFont('bold', 'display');
  const { t } = useTranslation();
  const { updateResourcePath } = useSetting();
  const resourcePath = useAppSelector(getResourcePath);
  const { isDrawer } = useNavShell();

  // Same shell check as (home)/_layout.tsx: only the kids drawer shell has
  // a drawer to toggle, so only it gets the hamburger. The corporate
  // permanent rail has no drawer, and the corporate phone tab bar has no
  // drawer either (it's a Tabs navigator, not nested in a Drawer) — both
  // drop the button, same as before.

  useEffect(() => {
    if (!_.isEmpty(resourcePath)) return;
    updateResourcePath();
  }, []);

  // Child app bar (handoff §4): 18px display-bold on corporate; kids keep the stack's h4.
  const childHeaderTitleStyle = isCorporate
    ? {
        fontFamily: displayBold,
        fontSize: theme.fontSizes.subtitle,
        color: theme.colors.onBackground,
      }
    : undefined;

  // Web only: a reload or a direct link rebuilds the stack with one entry,
  // and the stock header draws nothing when there's no history. A native
  // deep link hits the same one-entry gap (canGoBack is false, so the
  // default headerLeft below renders nothing), which we accept for now.
  const learnerBackFor = (fallback: string) =>
    Platform.OS === 'web'
      ? { headerLeft: () => <LearnerBackButton fallback={fallback} /> }
      : {};

  return (
    <Stack
      initialRouteName="subjects"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: isCorporate ? displayBold : font,
          fontSize: theme.fontSizes.h4,
          color: theme.colors.onBackground,
        },
        headerTitleAlign: 'center',
        headerRight: isDrawer ? () => <DrawerButton /> : undefined,
        // F-12: on Android, react-native-screens can't relabel the stock
        // native-stack back button (setBackTitle is a no-op there), so it
        // keeps the OS's own English "Navigate up" even in the Khmer UI.
        // Render our own labelled BackButton instead — only when there's
        // somewhere to go back to, so the first screen in the stack stays
        // headerLeft-less. Web keeps its existing per-screen behaviour
        // (learnerBackFor's reload fallback, or the stock web back button
        // where that isn't set) untouched.
        ...(Platform.OS !== 'web'
          ? {
              headerLeft: ({ canGoBack }) =>
                canGoBack ? <BackButton /> : null,
            }
          : {}),
      }}>
      <Stack.Screen
        name="subjects"
        options={{ title: t('screen.subject.header') }}
      />
      <Stack.Screen
        name="courses"
        options={{
          title: t('screen.course.header'),
          ...learnerBackFor('/home/subjects'),
        }}
      />
      <Stack.Screen
        name="units"
        options={{
          title: t('screen.unit.header'),
          ...learnerBackFor('/home/courses'),
        }}
      />
      <Stack.Screen
        name="levels"
        options={{
          title: t('screen.level.header'),
          ...learnerBackFor('/home/units'),
          // Corporate Level Detail (handoff §3, amended 26 Sep): no title
          // text in the bar, but the back icon is the app's standard
          // Material arrow — same as everywhere else. Kids keeps the stock
          // centered title + Material back arrow untouched.
          ...(isCorporate
            ? {
                headerTitle: () => null,
                ...(Platform.OS !== 'web'
                  ? {
                      headerLeft: ({ canGoBack }) =>
                        canGoBack ? <BackButton /> : null,
                    }
                  : {
                      // Web's learnerBackFor above skips headerLeft for
                      // corporate, which left the Material arrow instead of
                      // this screen's chevron. Use the same reload-fallback
                      // back button.
                      headerLeft: () => (
                        <LearnerBackButton fallback="/home/units" />
                      ),
                    }),
              }
            : {}),
        }}
      />
      <Stack.Screen
        name="lessons/index"
        options={{
          ...learnerBackFor('/home/levels'),
          // Corporate Lesson screen (handoff, matching Level Detail above,
          // amended 26 Sep): no title text in the bar, but the back icon is
          // the app's standard Material arrow — same as everywhere else.
          // Kids keeps the stock centered title + Material back arrow
          // untouched.
          ...(isCorporate
            ? {
                headerTitle: () => null,
                ...(Platform.OS !== 'web'
                  ? {
                      headerLeft: ({ canGoBack }) =>
                        canGoBack ? <BackButton /> : null,
                    }
                  : {
                      headerLeft: () => (
                        <LearnerBackButton fallback="/home/levels" />
                      ),
                    }),
              }
            : {}),
        }}
      />
      <Stack.Screen name="lessons/[id]" />
      <Stack.Screen
        name="practices/[id]"
        options={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          ...(childHeaderTitleStyle
            ? { headerTitleStyle: childHeaderTitleStyle }
            : {}),
        }}
      />
      <Stack.Screen
        name="quizzes/[id]"
        options={{
          // Corporate value is only the pre-mount fallback — QuizScreen sets
          // the real quiz name via navigation.setOptions at mount, from the
          // selected module in redux. Kids
          // keep the literal 'Quiz' on purpose: kids screens must not change
          // in this pass (i18n-izing it is a one-line follow-up).
          title: isCorporate ? t('screen.lesson.quizTitle') : 'Quiz',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerRight: () => undefined,
          ...(childHeaderTitleStyle
            ? { headerTitleStyle: childHeaderTitleStyle }
            : {}),
        }}
      />
      <Stack.Screen name="result" options={{ headerLeft: () => null }} />
    </Stack>
  );
}
