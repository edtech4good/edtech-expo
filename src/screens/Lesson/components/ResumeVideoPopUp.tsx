import {
  Column,
  Expanded,
  FilledButton,
  H3,
  H4,
  OutlineButton,
  Row,
  SizedBox,
} from '@/components';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';

interface Props {
  header: string;
  onResume?: () => void;
  onClose?: () => void;
}

export default function ResumeVideoPopUp({
  header = '',
  onClose = () => undefined,
  onResume = () => undefined,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'column',
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.layouts.large * 2,
        borderRadius: theme.layouts.defaultRadius,
      }}>
      <H3 fontWeight="semi" color={theme.colors.primary}>
        {header}
      </H3>
      <H4 fontWeight="semi">
        {t('resumeVideo.question')}
      </H4>

      <SizedBox.Large height />
      <SizedBox.Large height />
      <Row>
        <Expanded>
          <OutlineButton onPress={onClose}>{t('button.no')}</OutlineButton>
        </Expanded>
        <SizedBox.Large width />
        <Expanded>
          <FilledButton onPress={onResume}>{t('button.yes')}</FilledButton>
        </Expanded>
      </Row>
    </View>
  );
}
