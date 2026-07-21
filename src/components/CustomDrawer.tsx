import { MaterialIcons } from '@expo/vector-icons';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Image } from 'react-native';
import { useTheme } from 'styled-components/native';
import BaseButton from './buttons/BaseButton';
import SizedBox from './layouts/SizedBox';
import Column from './layouts/Column';
import { Images } from '@/assets_edtech';
import H5 from './texts/H5';
import H4 from './texts/H4';
import H6 from './texts/H6';
import { router } from 'expo-router';
import { useAuth, useSyncContent } from '@/services';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import _ from 'lodash';
import { studentNavItems, teacherNavItems } from '@/constants';

interface DrawerItemProps {
  title: string;
  icon: string;
  url?: string;
  index?: number;
  onPress?: () => void;
}

export default function CustomDrawer(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const { downloadContentFromRpi } = useSyncContent();

  const drawerContentList = useMemo(
    () =>
      profile?.schooluserrole === 4
        ? studentNavItems
        : teacherNavItems,
    [profile],
  );

  const handleDrawerPress = (url: string) => {
    console.log('JESUS');
    if (url.includes('downloadRpi')) {
      console.log('Downloading');
      downloadContentFromRpi();
    } else router.navigate(url);
  };

  const handleLogOut = () => {
    // router.replace('/login');
    logout();
  };

  const renderDrawerItem = ({
    icon,
    title,
    url,
    index,
    onPress,
  }: DrawerItemProps) => {
    return (
      <BaseButton
        key={title}
        paddingHorizontal={theme.layouts.pageHorizontalPadding}
        paddingVertical={theme.layouts.pageVerticalPadding}
        justifyContent="flex-start"
        alignItems="center"
        // style={drawerItemAdditionalStyle}
        style={{
          minHeight: theme.layouts.defaultComponentSize,
        }}
        onPress={onPress}>
        <SizedBox.Large width />
        <MaterialIcons
          name={icon}
          size={theme.fontSizes.h4}
          color={theme.colors.onSurfaceVariant}
        />
        <SizedBox.Large width />
        <H5
          color={theme.colors.onSurfaceVariant}
          fontWeight="semi"
          textVerticalAlign="bottom">
          {title}
        </H5>
      </BaseButton>
    );
  };

  const renderDrawerContentList = () => {
    return _.map(drawerContentList, dcl =>
      renderDrawerItem({
        icon: dcl.icon,
        title: t(`${dcl.title}`),
        url: dcl.url,
        onPress: () => handleDrawerPress(dcl.route),
      }),
    );
  };

  const renderProfile = () => {
    return (
      <Column
        backgroundColor={theme.colors.primaryLight}
        justifyContent="center"
        alignItems="center"
        paddingTop={theme.layouts.large}
        paddingBottom={theme.layouts.large}>
        <SizedBox.Large height />
        <Image source={Images.SampleProfile} />
        <SizedBox.Large height />
        <H4 color={theme.colors.onSurface} fontWeight="bold">
          {`${profile?.studentfirstname} ${profile?.studentlastname}`}
        </H4>
        <H6 color={theme.colors.onSurfaceVariant} fontWeight="semi">
          {`${t('screen.profile.studentIdLabel')}: ${profile?.schoolusername}`}
        </H6>
        <SizedBox.Large height />
      </Column>
    );
  };

  return (
    <DrawerContentScrollView>
      {renderProfile()}
      <SizedBox.Large height />
      {/* {renderDrawerItem({
        title: t('drawer.home'),
        icon: 'home',
        url: '/home/courses',
        onPress: () => handleDrawerPress('/home/subjects'),
      })}
      {renderDrawerItem({
        title: t('drawer.profile'),
        icon: 'account-circle',
        url: '/dashboard',
        onPress: () => handleDrawerPress('/profile'),
      })} */}
      {renderDrawerContentList()}
      {renderDrawerItem({
        title: t('drawer.logout'),
        icon: 'logout',
        url: '/login',
        onPress: handleLogOut,
      })}
    </DrawerContentScrollView>
  );
}
