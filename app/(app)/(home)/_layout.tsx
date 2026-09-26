import {
  CustomDrawer,
  DrawerButton,
  LogoutButton,
  NavRail,
  NavSidebar,
  NAV_RAIL_WIDTH,
  NAV_SIDEBAR_WIDTH,
} from '@/components';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useFont, useNavShell } from '@/services';
import { MaterialIcons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

// Khmer tab bar labels (design v2.1 Khmer type scale): 13px/lineHeight 18
// instead of the English 10px — Khmer text is illegible at that size.
// English is left on the navigator's default tabBarStyle/label sizing
// entirely (no height/padding override) so its look is unchanged; Khmer
// gets an explicit taller bar (base height + extra padding) so the bigger
// label doesn't clip against the bar's bottom edge.
const TAB_BAR_LABEL_FONT_SIZE_KM = 13;
const TAB_BAR_LABEL_LINE_HEIGHT_KM = 18;
const TAB_BAR_BASE_HEIGHT_KM = 64;
const TAB_BAR_PADDING_TOP_KM = 8;
const TAB_BAR_PADDING_BOTTOM_KM = 6;

export default function Home() {
  const theme = useTheme();
  const { t } = useTranslation();
  const font = useFont('semi');
  const { isRail, isSidebar, isTabs, hasPermanentNav } = useNavShell();
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  const insets = useSafeAreaInsets();

  // Phone tab headers (My progress and Profile share one look).
  const phoneHeaderOptions = {
    headerShown: true,
    headerTitleAlign: 'center' as const,
    headerTitleStyle: {
      fontFamily: font,
      fontSize: theme.fontSizes.h4,
      color: theme.colors.customHeaderTitle,
    },
    headerShadowVisible: false,
    headerStyle: { backgroundColor: theme.colors.customAppBar },
  };

  // Rendering <Tabs> vs <Drawer> below is a component-type swap in this
  // layout's own output (not inside a shared child slot like drawerContent),
  // so React remounts the whole subtree when isTabs flips — the hook-order
  // caveat on drawerContent below does not apply to this branch. It still
  // matters that every hook in this component is called unconditionally
  // above the branch, exactly as they are here. Swapping shells also resets
  // nested navigation state (React Navigation discards state whose navigator
  // type changed), so a web resize across 768dp lands on Home rather than
  // crashing; phones are orientation-locked so this only fires via the dev
  // theme toggle.
  if (isTabs) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            ...(isKhmer
              ? {
                  height: TAB_BAR_BASE_HEIGHT_KM + insets.bottom,
                  paddingTop: TAB_BAR_PADDING_TOP_KM,
                  paddingBottom: TAB_BAR_PADDING_BOTTOM_KM + insets.bottom,
                }
              : {}),
          },
          tabBarLabelStyle: {
            fontFamily: font,
            fontSize: isKhmer ? TAB_BAR_LABEL_FONT_SIZE_KM : 10,
            ...(isKhmer ? { lineHeight: TAB_BAR_LABEL_LINE_HEIGHT_KM } : {}),
          },
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: t('drawer.home'),
            tabBarTestID: 'tab-home',
            tabBarAccessibilityLabel: t('drawer.home'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library/index"
          options={{
            title: t('drawer.library'),
            tabBarTestID: 'tab-library',
            tabBarAccessibilityLabel: t('drawer.library'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="local-library" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress/index"
          options={{
            ...phoneHeaderOptions,
            title: t('screen.myProgress.title'),
            tabBarTestID: 'tab-progress',
            tabBarAccessibilityLabel: t('screen.myProgress.title'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons
                name="insert-chart-outlined"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            ...phoneHeaderOptions,
            title: t('drawer.profile'),
            headerRight: () => <LogoutButton />,
            headerRightContainerStyle: {
              paddingRight: theme.layouts.medium,
            },
            tabBarTestID: 'tab-profile',
            tabBarAccessibilityLabel: t('drawer.profile'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="account-circle" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    );
  }

  return (
    <Drawer
      // Swap elements, not components, in drawerContent: expo-router/drawer
      // calls this as a plain function inside the Drawer's own fiber, and
      // NavRail / NavSidebar call different hooks than CustomDrawer.
      // Passing `isRail ? NavRail : CustomDrawer` would swap which function
      // fills those hook slots without remounting, which is a hook-order
      // violation the moment the shell flips at runtime (dev theme toggle,
      // web resize across the 768 or 1280 breakpoint). Rendering elements
      // lets React key off the differing component type and remount cleanly
      // instead.
      drawerContent={props =>
        isSidebar ? (
          <NavSidebar {...props} />
        ) : isRail ? (
          <NavRail {...props} />
        ) : (
          <CustomDrawer {...props} />
        )
      }
      initialRouteName="profile/index"
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: font,
          fontSize: theme.fontSizes.h4,
          color: theme.colors.customHeaderTitle,
        },
        drawerPosition: hasPermanentNav ? 'left' : 'right',
        headerLeft: () => null,
        ...(hasPermanentNav
          ? {
              drawerType: 'permanent' as const,
              drawerStyle: {
                width: isSidebar ? NAV_SIDEBAR_WIDTH : NAV_RAIL_WIDTH,
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
        name="library/index"
        // headerShown: false only for the corporate permanent nav (rail or
        // sidebar) — LibraryScreen renders its own "Library" title there, and
        // the rail/sidebar itself is the permanent nav. The kids theme
        // reaches this same Drawer branch (see useNavShell: isDrawer is the
        // "neither rail, sidebar nor tabs" case) but has no nav entry point
        // to Library today — a kids learner who still lands here (e.g. a
        // stale deep link) previously got a headerless dead end with no way
        // back except an edge-swipe on the drawer. Give kids the same real
        // header (with a DrawerButton to reopen the drawer) every other kids
        // screen in this navigator gets, instead of hiding it just for this
        // one route.
        options={{
          headerShown: !hasPermanentNav,
          headerRight: hasPermanentNav ? undefined : () => <DrawerButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.customAppBar },
          title: t('drawer.library'),
        }}
      />
      <Drawer.Screen
        name="progress/index"
        options={{
          // Rail and sidebar: My progress carries its own large title, so no
          // header bar (design v2 tablet and desktop mocks have none). The
          // kids drawer has no entry for this route.
          headerShown: !hasPermanentNav,
          headerRight: hasPermanentNav ? undefined : () => <DrawerButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.customAppBar },
          title: t('screen.myProgress.title'),
        }}
      />
      <Drawer.Screen
        name="profile/index"
        options={{
          headerRight: hasPermanentNav ? undefined : () => <DrawerButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.customAppBar },
          title: t('drawer.profile'),
        }}
      />
    </Drawer>
  );
}
