import { DrawerButton } from '@/components';
import { useAppSelector } from '@/redux';
import { getResourcePath } from '@/redux/slices';
import { useFont, useSetting } from '@/services';
import { Stack } from 'expo-router';
import _ from 'lodash';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

export default function HomeStack() {
  const theme = useTheme();
  const font = useFont('semi');
  const { t } = useTranslation();
  const { updateResourcePath } = useSetting();
  const resourcePath = useAppSelector(getResourcePath);

  useEffect(() => {
    if (!_.isEmpty(resourcePath)) return;
    updateResourcePath();
  }, []);

  return (
    <Stack
      initialRouteName="subjects"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: font,
          fontSize: theme.fontSizes.h4,
          color: theme.colors.onBackground,
        },
        headerTitleAlign: 'center',
        headerRight: () => <DrawerButton />,
      }}>
      <Stack.Screen
        name="subjects"
        options={{ title: t('screen.subject.header') }}
      />
      <Stack.Screen
        name="courses"
        options={{ title: t('screen.course.header') }}
      />
      <Stack.Screen name="units" options={{ title: t('screen.unit.header') }} />
      <Stack.Screen
        name="levels"
        options={{ title: t('screen.level.header') }}
      />
      <Stack.Screen name="lessons/index" />
      <Stack.Screen name="lessons/[id]" />
      <Stack.Screen
        name="practices/[id]"
        options={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      />
      <Stack.Screen
        name="quizzes/[id]"
        options={{
          title: 'Quiz',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerRight: () => undefined,
        }}
      />
      <Stack.Screen name="result" options={{ headerLeft: () => null }} />
    </Stack>
  );
}
