import {
  Expanded,
  FilledButton,
  H4,
  OutlineButton,
  Row,
  SizedBox,
} from '@/components';
import AppButton from '../ui/AppButton';
import EyebrowText from '../ui/EyebrowText';
import ProgressBar from '../ui/ProgressBar';
import { useDesign } from '@/services';
import { View } from 'react-native';
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
  const { isCorporate } = useDesign();

  if (isCorporate) {
    // Corporate color-pass: the handoff's 4px blue question track plus
    // pill buttons replace the kids footer. Same props, same handlers.
    const progress =
      maxQuestion > 0 ? Math.min(1, currentQuestionIndex / maxQuestion) : 0;
    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.layouts.large,
          paddingVertical: theme.layouts.large,
          gap: 12,
        }}>
        <ProgressBar variant="quiz" progress={progress} />
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppButton
            label={t('screen.practice.submitButton')}
            size="md"
            onPress={onSubmit}
          />
          <AppButton
            label={t('screen.practice.retryButton')}
            variant="secondary"
            size="md"
            disabled={isShowingAnswer}
            onPress={onRetry}
          />
          <Expanded />
          <EyebrowText size={10} color={theme.colors.primary}>
            {`${currentQuestionIndex} / ${maxQuestion}`}
          </EyebrowText>
        </View>
      </View>
    );
  }

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
