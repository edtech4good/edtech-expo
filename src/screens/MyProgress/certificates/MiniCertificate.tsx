import { useFont, useTypeRole } from '@/services';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

/**
 * A small picture of the certificate (title, the learner's name, the code) for
 * the card and the detail screen. A picture only: the text around it carries
 * the meaning, so it is hidden from assistive tech.
 */
export default function MiniCertificate({
  name,
  code,
  large = false,
}: {
  name: string;
  code: string;
  large?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const caption = useTypeRole('caption');
  const display = useFont('semi', 'display');
  const body = useFont('semi', 'body');
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      testID="mini-certificate"
      style={{
        alignSelf: 'stretch',
        alignItems: 'center',
        gap: large ? 8 : 4,
        paddingVertical: large ? 24 : 12,
        paddingHorizontal: 12,
        borderRadius: theme.radii.card,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
      }}>
      <Text
        style={{
          fontFamily: caption.fontFamily,
          fontSize: Math.max(12, caption.fontSize),
          color: theme.colors.primary,
          textAlign: 'center',
        }}>
        {t('certificates.miniTitle')}
      </Text>
      {name !== '' && (
        <Text
          numberOfLines={2}
          style={{
            fontFamily: display,
            fontSize: large ? 24 : 18,
            lineHeight: large ? 32 : 26,
            color: theme.colors.onBackground,
            textAlign: 'center',
          }}>
          {name}
        </Text>
      )}
      <Text
        style={{
          fontFamily: body,
          fontSize: Math.max(12, caption.fontSize),
          color: theme.colors.onSurfaceVariant,
          letterSpacing: 1,
        }}>
        {code}
      </Text>
    </View>
  );
}
