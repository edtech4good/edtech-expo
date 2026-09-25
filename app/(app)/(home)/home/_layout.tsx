import { BackButton, DrawerButton, LearnerBackButton } from '@/components';
import { useAppSelector } from '@/redux';
import { getResourcePath } from '@/redux/slices';
import { useDesign, useFont, useNavShell, useSetting } from '@/services';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { RouteProp, ParamListBase } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
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
        // expo-router's Screen typing declares `options` as a plain object
        // (NativeStackNavigationOptions), but at runtime it forwards a
        // function form straight through to the same underlying
        // react-navigation Screen, which does support `options` as a
        // function of `route`/`navigation` — see
        // node_modules/expo-router/build/useScreens.js. Cast to bridge that
        // typing gap without changing behavior.
        options={(({ route }: { route: RouteProp<ParamListBase, string> }) => {
          // Library isn't part of this drill-down Stack, so a level opened
          // from it (LibraryScreen's `from: 'library'` param) has no
          // back-stack entry pointing at Library — this stack's normal back
          // handling (native default / web's LearnerBackButton fallback
          // above) would instead pop to /home/units, the drill-down's
          // parent, or — once the learner has actually browsed Subjects →
          // Courses → Units — silently back into that history instead of
          // Library, since LearnerBackButton only falls back when
          // canGoBack() is false. So when opened `from: 'library'`,
          // override the header back button with one that unconditionally
          // navigates to /library — never router.back() — regardless of
          // what's on this stack underneath, and disable the swipe-back
          // gesture so it can't sneak past this override (LevelSelection-
          // Screen's `beforeRemove` listener covers hardware back /
          // swipe-back attempts that do get through). A normal drill-down
          // visit (no `from` param) keeps the existing options untouched.
          const fromLibrary = route.params
            ? (route.params as { from?: string }).from === 'library'
            : false;
          if (fromLibrary) {
            return {
              title: t('screen.level.header'),
              gestureEnabled: false,
              headerLeft: () => (
                <BackButton onPress={() => router.navigate('/library')} />
              ),
            };
          }
          return {
            title: t('screen.level.header'),
            ...learnerBackFor('/home/units'),
          };
        }) as unknown as NativeStackNavigationOptions}
      />
      <Stack.Screen
        name="lessons/index"
        options={learnerBackFor('/home/levels')}
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
