import { Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';
import IconButton from './IconButton';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackChevronIcon } from '../ui/StatusIcon';

interface Props {
  onPress?: () => void;
  /**
   * 'default' = the Material keyboard-backspace arrow (kids + every other
   * corporate app bar). 'chevron' = the handoff's 20px "‹" glyph with a
   * 44pt hit target — corporate Level Detail's app bar only (handoff §3:
   * "back chevron only, no title text"). Kids never gets this variant.
   */
  variant?: 'default' | 'chevron';
}

// Android's touch-target guideline is 48dp; the icon alone renders smaller
// than that, so pad the tappable area out to it (evenly, on all sides)
// without changing the icon's own size or the button's layout.
const MIN_HIT_TARGET = 48;
// The corporate chevron variant follows the handoff's own 44pt touch
// minimum instead.
const CHEVRON_HIT_TARGET = 44;
const CHEVRON_ICON_SIZE = 20;

export default function BackButton({
  onPress = undefined,
  variant = 'default',
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const handleBackPress = () => {
    if (onPress) onPress();
    else router.back();
  };

  if (variant === 'chevron') {
    const slop = Math.max(
      0,
      (CHEVRON_HIT_TARGET - CHEVRON_ICON_SIZE) / 2,
    );
    return (
      <Pressable
        onPress={handleBackPress}
        accessibilityRole="button"
        accessibilityLabel={t('button.back')}
        hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
        style={{
          width: CHEVRON_ICON_SIZE,
          height: CHEVRON_ICON_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: theme.layouts.large,
        }}>
        <BackChevronIcon size={CHEVRON_ICON_SIZE} color={theme.colors.onBackground} />
      </Pressable>
    );
  }

  const iconSize = theme.fontSizes.h3;
  const slop = Math.max(0, (MIN_HIT_TARGET - iconSize) / 2);

  return (
    <IconButton
      onPress={handleBackPress}
      icon="keyboard-backspace"
      iconSize={iconSize}
      style={{ marginLeft: theme.layouts.large }}
      accessibilityLabel={t('button.back')}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
    />
  );
}
