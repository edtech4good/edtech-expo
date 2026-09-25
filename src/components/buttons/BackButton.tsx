import { useTheme } from 'styled-components/native';
import IconButton from './IconButton';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

interface Props {
  onPress?: () => void;
}

// Android's touch-target guideline is 48dp; the icon alone renders smaller
// than that, so pad the tappable area out to it (evenly, on all sides)
// without changing the icon's own size or the button's layout.
const MIN_HIT_TARGET = 48;

export default function BackButton({ onPress = undefined }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const handleBackPress = () => {
    if (onPress) onPress();
    else router.back();
  };

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
