import {
  Expanded,
  FilledButton,
  H4,
  OutlineButton,
  Row,
  SizedBox,
} from '@/components';
import AppButton from '../ui/AppButton';
import RefreshIcon from '../ui/icons/RefreshIcon';
import { useDesign } from '@/services';
import { useContext } from 'react';
import { Platform, View } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';

interface Props {
  isShowingAnswer?: boolean;
  currentQuestionIndex: number;
  maxQuestion: number;
  onRetry: () => void;
  onSubmit: () => void;
  // Quiz has no Retry equivalent — hides the pill and shows only Submit.
  hideRetry?: boolean;
}

export default function ({
  isShowingAnswer = false,
  currentQuestionIndex,
  maxQuestion,
  onRetry = () => undefined,
  onSubmit = () => undefined,
  hideRetry = false,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const insets = useSafeAreaInsets();
  // Undefined outside a bottom-tabs navigator (kids drawer, corporate rail
  // on tablet/desktop) -> 0, same fallback used by Container/
  // useScreenDimension elsewhere.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

  if (isCorporate) {
    // Corporate color-pass (v2.1): the "n / max" counter and the 4px
    // progress track have moved up into the child app bar (handoff §4),
    // so the footer is only the Submit / Retry pill row now. Submit grows
    // to fill the space; Retry is fixed-width with a leading refresh icon.
    // Quiz has no Retry equivalent, so it passes hideRetry and gets a
    // Submit-only footer.
    //
    // Handoff §4: the footer sits above the tab bar/safe area with a top
    // hairline. On phone the bottom tab bar already reserves the bottom
    // safe-area inset itself, so adding insets.bottom here too would
    // double-pad above it — only add it when there's no tab bar under us
    // (tablet/desktop rail, or web). On iOS, the ancestor StyledSafeArea is
    // RN's SafeAreaView, which already pads the bottom inset itself, so
    // adding it again here would double-pad there too — Android/web's
    // SafeAreaView is a no-op, so they still need it.
    const safeBottomPadding =
      tabBarHeight > 0 || Platform.OS === 'ios' ? 0 : insets.bottom;
    return (
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
          paddingBottom: safeBottomPadding,
        }}>
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
              testID="footer-submit"
              label={t('screen.practice.submitButton')}
              size="lg"
              fullWidth
              onPress={onSubmit}
            />
          </View>
          {!hideRetry && (
            <AppButton
              testID="footer-retry"
              label={t('screen.practice.retryButton')}
              variant="secondary"
              size="lg"
              disabled={isShowingAnswer}
              icon={<RefreshIcon color={theme.colors.primary} />}
              onPress={onRetry}
            />
          )}
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
