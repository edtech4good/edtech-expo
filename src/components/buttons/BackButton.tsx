import { useTheme } from 'styled-components/native';
import IconButton from './IconButton';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

interface Props {
  onPress?: () => void;
}

export default function BackButton({ onPress = undefined }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const handleBackPress = () => {
    if (onPress) onPress();
    else router.back();
  };

  return (
    <IconButton
      onPress={handleBackPress}
      icon="keyboard-backspace"
      iconSize={theme.fontSizes.h3}
      style={{ marginLeft: theme.layouts.large }}
      accessibilityLabel={t('button.back')}
    />
  );
}
