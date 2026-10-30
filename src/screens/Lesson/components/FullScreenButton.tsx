import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';

// Android's touch-target floor is 48 dp; the issue asks for at least 44 pt.
export const FULL_SCREEN_BUTTON_SIZE = 48;

interface Props {
  isFullScreen: boolean;
  onPress: () => void;
}

/**
 * The lesson video's full-screen toggle. Labelled for TalkBack in the
 * interface language, and the label follows the state ("Full screen" to open,
 * "Exit full screen" to close) so a screen-reader user hears what a press
 * will do.
 */
export default function FullScreenButton({ isFullScreen, onPress }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(
        isFullScreen ? 'player.fullScreenClose' : 'player.fullScreenOpen',
      )}
      style={{
        width: FULL_SCREEN_BUTTON_SIZE,
        height: FULL_SCREEN_BUTTON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <MaterialCommunityIcons
        name={isFullScreen ? 'fullscreen-exit' : 'fullscreen'}
        size={32}
        color={theme.colors.onSurface}
      />
    </Pressable>
  );
}
