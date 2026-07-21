import { CustomDrawer, DrawerButton, NavRail, NAV_RAIL_WIDTH } from '@/components';
import { useDesign } from '@/services';
import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';

export default function Home() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const { width } = useWindowDimensions();

  // Corporate theme at tablet width replaces the phone drawer with a
  // permanent left nav rail (docs/design/corporate-mobile/README.md).
  // Kids theme and narrow widths keep the existing right-side drawer.
  const isRail = isCorporate && width >= theme.breakpoints.DEFAULT_MIN_WIDTH;

  console.log('MAJI');

  return (
    <Drawer
      // Swap elements, not components, in drawerContent: expo-router/drawer
      // calls this as a plain function inside the Drawer's own fiber, and
      // NavRail calls one more hook (useSafeAreaInsets) than CustomDrawer.
      // Passing `isRail ? NavRail : CustomDrawer` would swap which function
      // fills that hook slot without remounting, which is a hook-order
      // violation the moment isRail flips at runtime (dev theme toggle, web
      // resize across the 768 breakpoint). Rendering elements lets React
      // key off the differing component type and remount cleanly instead.
      drawerContent={props =>
        isRail ? <NavRail {...props} /> : <CustomDrawer {...props} />
      }
      initialRouteName="profile/index"
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: 'PoppinsSemiBold',
          fontSize: theme.fontSizes.h4,
          color: theme.colors.customHeaderTitle,
        },
        drawerPosition: isRail ? 'left' : 'right',
        headerLeft: () => null,
        ...(isRail
          ? {
              drawerType: 'permanent' as const,
              drawerStyle: {
                width: NAV_RAIL_WIDTH,
                borderRightWidth: 0,
                backgroundColor: theme.colors.surface,
              },
            }
          : {}),
      }}>
      <Drawer.Screen name="home" options={{ headerShown: false }} />
      <Drawer.Screen
        name="teacher/dashboard"
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="profile/index"
        options={{
          headerRight: isRail ? undefined : () => <DrawerButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.customAppBar },
          title: t('drawer.profile'),
        }}
      />
      <Drawer.Screen
        name="dashboard/index"
        options={{
          headerRight: isRail ? undefined : () => <DrawerButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.customAppBar },
          title: 'Dashboard',
        }}
      />
    </Drawer>
  );
}
