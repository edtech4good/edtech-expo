import { CustomDrawer, DrawerButton } from '@/components';
import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

export default function Home() {
  const theme = useTheme();
  const { t } = useTranslation();

  console.log('MAJI');

  return (
    <Drawer
      drawerContent={CustomDrawer}
      initialRouteName="profile/index"
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: 'PoppinsSemiBold',
          fontSize: theme.fontSizes.h4,
          color: theme.colors.customHeaderTitle,
        },
        drawerPosition: 'right',
        headerLeft: () => null,
      }}>
      <Drawer.Screen name="home" options={{ headerShown: false }} />
      <Drawer.Screen
        name="teacher/dashboard"
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="profile/index"
        options={{
          headerRight: () => <DrawerButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.customAppBar },
          title: t('drawer.profile'),
        }}
      />
      <Drawer.Screen
        name="dashboard/index"
        options={{
          headerRight: () => <DrawerButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.customAppBar },
          title: 'Dashboard',
        }}
      />
    </Drawer>
  );
}
