import { useAuth } from '@/services';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import AppIconButton from './AppIconButton';

const ICON_SIZE = 24;

/**
 * Header logout control for the corporate phone tab shell. On the
 * corporate theme at phone widths (< 768dp), navigation renders as bottom
 * tabs (see useNavShell) — there is no kids drawer (CustomDrawer) and no
 * tablet nav rail (NavRail), the two places logout otherwise lives, so
 * without this a phone learner has no way to sign out. Rendered as
 * `headerRight` on the Profile tab. See ROADMAP Track B.
 */
export default function LogoutButton() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <AppIconButton
      variant="plain"
      icon={
        <MaterialIcons
          name="logout"
          size={ICON_SIZE}
          color={theme.colors.onSurfaceVariant}
        />
      }
      accessibilityLabel={t('drawer.logout')}
      testID="logout-button"
      onPress={() => logout()}
    />
  );
}
