import { CustomDrawer, DrawerButton } from '@/components';
import { useFont } from '@/services';
import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

export default function Home() {
  const theme = useTheme();
  const { t } = useTranslation();
  const font = useFont('semi');

  // Own Drawer navigator under the (app) Stack, a sibling of (home) — never
  // inside any nav shell (rail / tabs / kids drawer). DrawerButton's
  // toggleDrawer resolves against this Drawer. Learners (schooluserrole 4)
  // never reach it (useAuth routes them to /home), so no useNavShell gating.
  return (
    <Drawer
      drawerContent={CustomDrawer}
      initialRouteName="teacher/dashboard"
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: font,
          fontSize: theme.fontSizes.h4,
          color: theme.colors.customHeaderTitle,
        },
        drawerPosition: 'right',
        headerLeft: () => null,
        headerRight: () => <DrawerButton />,
      }}>
      <Drawer.Screen name="teacher/dashboard" />
      <Drawer.Screen name="teacher/score" />
      <Drawer.Screen name="teacher/student" />
    </Drawer>
  );
}
