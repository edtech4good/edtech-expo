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
    // Corporate color-pass: the footer stretches full-width so the handoff's
    // 4px blue question track can run full-bleed above the pill buttons,
    // which replace the kids footer. Same props, same handlers.
    const progress =
      maxQuestion > 0 ? Math.min(1, currentQuestionIndex / maxQuestion) : 0;
    return (
      // alignSelf stretch: Container centres its children, which shrink-wrapped this bar to its buttons and collapsed the track's 100% width to 0 (audit U-04/U-05).
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: theme.colors.surface,
        }}>
        <ProgressBar variant="quiz" progress={progress} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: theme.layouts.pageHorizontalPadding,
            paddingVertical: theme.layouts.large,
          }}>
          <View style={{ flex: 1 }}>
            <AppButton
              label={t('screen.practice.submitButton')}
              size="md"
              fullWidth
              onPress={onSubmit}
            />
          </View>
          <AppButton
            label={t('screen.practice.retryButton')}
            variant="secondary"
            size="md"
            disabled={isShowingAnswer}
            onPress={onRetry}
          />
          <EyebrowText
            size={theme.fontSizes.eyebrow}
            color={theme.colors.primary}>
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
