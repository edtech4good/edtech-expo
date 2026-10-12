import { View, Text } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components';
import { useTypeRole } from '@/services';

interface Props {
  /** The item's own name (lessonlearningname). */
  name: string;
  onClose: () => void;
}

/**
 * Shown by the learning screen when the selected item is of a type this build
 * cannot render (learning-item types, design note §4). It stands in for the
 * player: nothing is fetched and no progress is posted, so the item can never
 * reach the empty-source "complete on open" path. The lesson list already
 * keeps such an item from being opened; this covers a persisted selection or
 * a deep link.
 */
export default function UnsupportedItemNotice({ name, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const titleType = useTypeRole('cardTitle');
  const bodyType = useTypeRole('body');

  return (
    <View
      testID="unsupported-item-notice"
      style={{
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: theme.layouts.pageHorizontalPadding,
        backgroundColor: theme.colors.background,
      }}>
      <Text
        style={{
          fontFamily: titleType.fontFamily,
          fontSize: titleType.fontSize,
          lineHeight: titleType.lineHeight,
          color: theme.colors.onBackground,
          textAlign: 'center',
        }}>
        {name}
      </Text>
      <Text
        style={{
          fontFamily: bodyType.fontFamily,
          fontSize: bodyType.fontSize,
          lineHeight: bodyType.lineHeight,
          color: theme.colors.onSurfaceVariant,
          textAlign: 'center',
        }}>
        {t('screen.lesson.unsupportedItem')}
      </Text>
      <View style={{ alignSelf: 'center' }}>
        <AppButton
          variant="secondary"
          size="lg"
          label={t('button.back')}
          onPress={onClose}
          testID="unsupported-item-back"
        />
      </View>
    </View>
  );
}
