import { useTheme } from 'styled-components/native';
import Column from './layouts/Column';
import { Image } from 'react-native';
import { Images } from '@/assets_edtech';
import Divider from './layouts/Divider';
import SH3 from './texts/SH3';
import SizedBox from './layouts/SizedBox';
import { useAuth } from '@/services';
import H4 from './texts/H4';
import H6 from './texts/H6';
import { useTranslation } from 'react-i18next';

export default function TeacherProfileCard() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { profile } = useAuth();

  return (
    <Column
      borderRadius={theme.layouts.defaultRadius}
      backgroundColor={theme.colors.surface}
      style={{
        // width: 379,
        // height: 496,
        borderWidth: theme.layouts.divider,
        borderColor: theme.colors.divider,
        padding: theme.layouts.large,
      }}>
      <Image
        source={Images.SampleProfile}
        style={{ width: 180, height: 180 }}
      />
      <SizedBox.Large height />
      <H4>{`${t('screen.profile.hiLabel')} ${profile?.schoolusername}`}</H4>
      <Divider color={theme.colors.divider} height={theme.layouts.large} />
      <SH3 color={theme.colors.onSurfaceVariant}>
        {t('screen.profile.teacherIdLabel')}
      </SH3>
      <H6 fontWeight="bold">{profile?.schoolusername}</H6>
      <Divider color={theme.colors.divider} height={theme.layouts.large} />
      <SH3 color={theme.colors.onSurfaceVariant}>
        {t('screen.profile.schooNameLabel')}
      </SH3>
      <H6 fontWeight="bold">{profile?.schoolname}</H6>
    </Column>
  );
}
