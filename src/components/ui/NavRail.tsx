import { Images as EdtechImages } from '@/assets_edtech';
import { Images } from '@/assets';
import { studentNavItems, teacherNavItems, NavItem } from '@/constants';
import { useAuth, useSyncContent } from '@/services';
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureResponderEvent, Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

export const NAV_RAIL_WIDTH = 88;
const ITEM_WIDTH = 56;
const ITEM_HEIGHT = 48;
const LOGO_SIZE = 40;
const AVATAR_SIZE = 40;
const ICON_SIZE = 24;

/**
 * Permanent left nav rail shown on the corporate theme at tablet widths,
 * replacing the phone drawer (docs/design/corporate-mobile/README.md —
 * "Nav rail (tablet): 88pt wide, 40pt logo tile top, 56×48 r14 items
 * (active = rgba(11,95,255,0.10) tint), avatar pinned bottom"). The design
 * doc calls for r14 items; the token set has no r14, so per the token-first
 * rule this uses the nearest token, theme.radii.media (12), rather than a
 * hardcoded 14. Mirrors CustomDrawer's role selection, navigation and
 * logout — it is the same drawer content, laid out as an icon rail instead
 * of a scrolling list.
 */

// Maps a nav item's `route` to the react-navigation route name reported by
// props.state, so the active item can be highlighted. Explicit rather than
// string surgery because the two rarely match 1:1 (e.g. '/home/subjects'
// is the 'home' screen).
const ROUTE_NAME_BY_ITEM_ROUTE: Record<string, string> = {
  '/home/subjects': 'home',
  '/profile': 'profile/index',
  'teacher/dashboard': 'teacher/dashboard',
  // 'teacher/score' has no backing route in this navigator today — it never
  // matches props.state's route names, so this item never highlights. Kept
  // here anyway for parity with teacherNavItems.
  'teacher/score': 'teacher/score',
  // 'downloadRpi' intentionally omitted — it triggers a download, not a
  // navigation, so it can never be the active route.
};

const Rail = styled(View)`
  flex: 1;
  width: ${NAV_RAIL_WIDTH}px;
  background-color: ${p => p.theme.colors.surface};
  border-right-width: 1px;
  border-right-color: ${p => p.theme.colors.divider};
  align-items: center;
`;

interface ItemShapeProps {
  $active?: boolean;
}

const ItemShape = styled(Pressable)<ItemShapeProps>`
  width: ${ITEM_WIDTH}px;
  height: ${ITEM_HEIGHT}px;
  border-radius: ${p => p.theme.radii.media}px;
  align-items: center;
  justify-content: center;
  background-color: ${p =>
    p.$active ? p.theme.colors.primaryLight : 'transparent'};
`;

function RailItem({
  iconName,
  active,
  accessibilityLabel,
  onPress,
}: {
  iconName: string;
  active?: boolean;
  accessibilityLabel: string;
  onPress?: (event: GestureResponderEvent) => void;
}) {
  const theme = useTheme();

  return (
    <ItemShape
      $active={active}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active }}>
      <MaterialIcons
        name={iconName}
        size={ICON_SIZE}
        color={active ? theme.colors.primary : theme.colors.onSurfaceVariant}
      />
    </ItemShape>
  );
}

export default function NavRail(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, logout } = useAuth();
  const { downloadContentFromRpi } = useSyncContent();

  const activeRouteName = props.state.routes[props.state.index]?.name;

  const navItems = useMemo(
    () => (profile?.schooluserrole === 4 ? studentNavItems : teacherNavItems),
    [profile],
  );

  const handleItemPress = (item: NavItem) => {
    if (item.route.includes('downloadRpi')) {
      downloadContentFromRpi();
    } else {
      router.navigate(item.route);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleAvatarPress = () => {
    router.navigate('/profile');
  };

  return (
    <Rail
      style={{
        paddingTop: insets.top + theme.layouts.large,
        paddingBottom: insets.bottom + theme.layouts.large,
      }}>
      <Image
        source={Images.BrandLogo}
        style={{ width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: 'contain' }}
      />

      <View style={{ marginTop: theme.layouts.large, gap: theme.layouts.small }}>
        {navItems.map(item => (
          <RailItem
            key={item.route}
            iconName={item.icon}
            active={ROUTE_NAME_BY_ITEM_ROUTE[item.route] === activeRouteName}
            accessibilityLabel={t(item.title)}
            onPress={() => handleItemPress(item)}
          />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <RailItem
        iconName="logout"
        accessibilityLabel={t('drawer.logout')}
        onPress={handleLogout}
      />

      <Pressable
        onPress={handleAvatarPress}
        accessibilityRole="button"
        accessibilityLabel={t('drawer.profile')}
        style={{ marginTop: theme.layouts.small }}>
        <Image
          source={EdtechImages.SampleProfile}
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: theme.radii.pill,
          }}
        />
      </Pressable>
    </Rail>
  );
}
