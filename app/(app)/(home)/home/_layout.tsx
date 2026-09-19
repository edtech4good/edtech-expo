import { DrawerButton, LearnerBackButton } from '@/components';
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
  // and the stock header draws nothing when there's no history. Gating on
  // web keeps the kids native screens byte-identical (handoff rule) — a
  // native deep link into one of these screens would hit the same
  // one-entry gap, which we accept for now.
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
        }}
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
