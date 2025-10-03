import { CustomDrawer, DrawerButton } from '@/components';
import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

export default function Home() {
  const theme = useTheme();
  const { t } = useTranslation();

  console.log('MAJU');
  return (
    <Drawer
      drawerContent={CustomDrawer}
      initialRouteName="teacher/dashboard"
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: 'PoppinsSemiBold',
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
