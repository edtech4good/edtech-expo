import { Images } from '@/assets';
import {
  progressNavItem,
  studentNavItems,
  teacherNavItems,
  NavItem,
} from '@/constants';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useAuth, useFont, useSyncContent } from '@/services';
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, TextStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

export const NAV_SIDEBAR_WIDTH = 248;
// brand_logo.png is a 320x72 wordmark; 140x32 keeps its aspect ratio
// (NavRail's 40x40 square box shrinks it to an unreadable sliver).
const LOGO_WIDTH = 140;
const LOGO_HEIGHT = 32;
const ITEM_HEIGHT = 48;
const ICON_SIZE = 24;
const AVATAR_SIZE = 40;

/**
 * Permanent labelled left sidebar for the corporate theme at desktop width
 * (useNavShell 'sidebar', >= theme.breakpoints.SIDEBAR_MIN_WIDTH). Design
 * handoff "My progress (corporate)" -> Desktop 1440x900: 248px, logo at the
 * top, labelled items (active = primaryLight tint, blue label/icon), profile
 * block pinned to the bottom.
 *
 * The mock also shows Library, Awards and a bell; those features don't exist
 * yet, so they are omitted. Students get Home and My progress (the
 * /progress route); Profile is reached from the profile block pinned to the
 * bottom rather than a list item. Teachers get teacherNavItems. Logout,
 * which the rail offers as an icon, is kept as a labelled item above the
 * profile block so nothing the rail offers is lost.
 */

// Maps a nav item's `route` to the react-navigation route name reported by
// props.state (same table as NavRail; 'downloadRpi' is an action, never
// active).
const ROUTE_NAME_BY_ITEM_ROUTE: Record<string, string> = {
  '/home/subjects': 'home',
  '/progress': 'progress/index',
  '/profile': 'profile/index',
  'teacher/dashboard': 'teacher/dashboard',
  'teacher/score': 'teacher/score',
};

export interface NavSidebarItem {
  key: string;
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}

export interface NavSidebarViewProps {
  items: NavSidebarItem[];
  studentName: string;
  onProfilePress: () => void;
  onLogout: () => void;
  /** Safe-area top/bottom padding; 0 in the dev gallery. */
  insetTop?: number;
  insetBottom?: number;
}

// Code-point safe initials from a full name (first + last word).
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = Array.from(parts[0])[0] ?? '';
  const last =
    parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return `${first}${last}`;
}

// Latin gets the given sizes; Khmer gets a 13px floor and 1.6x line height.
function useSidebarText() {
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  const semi = useFont('semi', 'body');
  const normal = useFont('normal', 'body');
  const displayBold = useFont('bold', 'display');
  return (
    weight: 'semi' | 'normal' | 'display',
    size: number,
    color: string,
    latinLineHeight: number,
  ): TextStyle => {
    const fontSize = isKhmer ? Math.max(13, size) : size;
    return {
      fontFamily:
        weight === 'semi' ? semi : weight === 'display' ? displayBold : normal,
      fontSize,
      lineHeight: isKhmer ? Math.round(fontSize * 1.6) : latinLineHeight,
      letterSpacing: 0,
      color,
    };
  };
}

function SidebarItem({ item }: { item: NavSidebarItem }) {
  const theme = useTheme();
  const text = useSidebarText();
  const color = item.active ? theme.colors.primary : theme.colors.onSurface;

  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: item.active }}
      style={({ pressed }) => ({
        minHeight: ITEM_HEIGHT,
        borderRadius: theme.radii.media,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor:
          item.active || pressed ? theme.colors.primaryLight : 'transparent',
      })}>
      <MaterialIcons
        name={item.icon as keyof typeof MaterialIcons.glyphMap}
        size={ICON_SIZE}
        color={
          item.active ? theme.colors.primary : theme.colors.onSurfaceVariant
        }
      />
      <Text
        numberOfLines={1}
        style={[text('semi', 16, color, 22), { flexShrink: 1 }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

/** Presentational sidebar — the dev gallery renders this with fixtures. */
export function NavSidebarView({
  items,
  studentName,
  onProfilePress,
  onLogout,
  insetTop = 0,
  insetBottom = 0,
}: NavSidebarViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const text = useSidebarText();

  return (
    <View
      style={{
        flex: 1,
        width: NAV_SIDEBAR_WIDTH,
        backgroundColor: theme.colors.surface,
        borderRightWidth: 1,
        borderRightColor: theme.colors.divider,
        paddingTop: insetTop + 28,
        paddingBottom: insetBottom + 20,
        paddingHorizontal: 16,
      }}>
      <View style={{ paddingHorizontal: 12 }}>
        <Image
          source={Images.BrandLogo}
          style={{
            width: LOGO_WIDTH,
            height: LOGO_HEIGHT,
            resizeMode: 'contain',
          }}
        />
      </View>

      <View style={{ marginTop: 32, gap: 8 }}>
        {items.map(item => (
          <SidebarItem key={item.key} item={item} />
        ))}
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />

      <SidebarItem
        item={{
          key: 'logout',
          label: t('drawer.logout'),
          icon: 'logout',
          active: false,
          onPress: onLogout,
        }}
      />

      <View
        style={{
          marginTop: 12,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
        }}>
        <Pressable
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel={
            studentName
              ? `${studentName}, ${t('drawer.profileAndSettings')}`
              : t('drawer.profileAndSettings')
          }
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: theme.radii.media,
            backgroundColor: pressed
              ? theme.colors.primaryLight
              : 'transparent',
          })}>
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text style={text('display', 16, theme.colors.onPrimary, 20)}>
              {initialsOf(studentName)}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {!!studentName && (
              <Text
                numberOfLines={1}
                style={text('semi', 15, theme.colors.onBackground, 20)}>
                {studentName}
              </Text>
            )}
            <Text
              numberOfLines={1}
              style={text('normal', 13, theme.colors.onSurfaceVariant, 18)}>
              {t('drawer.profileAndSettings')}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default function NavSidebar(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, logout } = useAuth();
  const { downloadContentFromRpi } = useSyncContent();

  const activeRouteName = props.state.routes[props.state.index]?.name;
  const isStudent = profile?.schooluserrole === 4;

  const navItems = useMemo(
    () =>
      isStudent
        ? [
            ...studentNavItems.filter(item => item.route !== '/profile'),
            progressNavItem,
          ]
        : teacherNavItems,
    [isStudent],
  );

  const handleItemPress = (item: NavItem) => {
    if (item.route.includes('downloadRpi')) {
      downloadContentFromRpi();
    } else {
      router.navigate(item.route);
    }
  };

  const items: NavSidebarItem[] = navItems.map(item => ({
    key: item.route,
    label: t(item.title),
    icon: item.icon,
    active: ROUTE_NAME_BY_ITEM_ROUTE[item.route] === activeRouteName,
    onPress: () => handleItemPress(item),
  }));

  const fullName = `${profile?.studentfirstname ?? ''} ${
    profile?.studentlastname ?? ''
  }`.trim();
  const displayName = fullName || profile?.schoolusername || '';

  return (
    <NavSidebarView
      items={items}
      studentName={displayName}
      onProfilePress={() => router.navigate('/profile')}
      onLogout={() => logout()}
      insetTop={insets.top}
      insetBottom={insets.bottom}
    />
  );
}
