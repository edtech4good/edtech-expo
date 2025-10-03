import {
  Expanded,
  FilledButton,
  H4,
  OutlineButton,
  Row,
  SizedBox,
} from '@/components';
import { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';

interface Props {
  isShowingAnswer?: boolean;
  currentQuestionIndex: number;
  maxQuestion: number;
  onRetry: () => void;
  onSubmit: () => void;
}

export default function ({
  isShowingAnswer = false,
  currentQuestionIndex,
  maxQuestion,
  onRetry = () => undefined,
  onSubmit = () => undefined,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Row
      backgroundColor={theme.colors.surface}
      paddingLeft={theme.layouts.large}
      paddingBottom={theme.layouts.large}
      paddingRight={theme.layouts.large}
      paddingTop={theme.layouts.large}>
      <FilledButton style={{ minWidth: 227 }} onPress={onSubmit}>
        {t('screen.practice.submitButton')}
      </FilledButton>
      <SizedBox.Large width />
      <OutlineButton
        disabled={isShowingAnswer}
        style={{ minWidth: 227 }}
        onPress={onRetry}>
        {t('screen.practice.retryButton')}
      </OutlineButton>
      <Expanded />
      <H4
        fontWeight="semi"
        color={
          theme.colors.primary
        }>{`${currentQuestionIndex}/${maxQuestion}`}</H4>
    </Row>
  );
}
