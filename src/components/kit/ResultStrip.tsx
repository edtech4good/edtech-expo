import AppButton from '@/components/ui/AppButton';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import hexAlpha from '@/utils/hexAlpha';
import { useSmallText, useTileText } from './kitText';
import ResultMark from './ResultMark';
import {
  CORRECT_TINT_ALPHA,
  INCORRECT_TINT_ALPHA,
} from './tileStyle';
import {
  FooterActionId,
  footerActions,
  resultAnnouncement,
  resultSummary,
  resultTitle,
} from './resultLogic';
import type { Translate } from '../drag/reorder';

export interface ResultStripProps {
  kind: 'correct' | 'incorrect';
  /** Items in the right place, when the question has parts. */
  correctCount?: number;
  total?: number;
  /** Correct state only: the finished answer read back, e.g. the sentence. */
  readBack?: string;
  /**
   * Footer actions. Give the handlers you want shown; the strip lays out
   * "Next" (correct) or "Show answer" + "Try again" (incorrect). Leave them
   * all out to render only the strip and put the buttons in the screen's
   * own footer (use `footerActions(kind)` for the list).
   */
  onNext?: () => void;
  onShowAnswer?: () => void;
  onTryAgain?: () => void;
  /** Quiz has no Try again; the answer may already be showing. */
  canShowAnswer?: boolean;
  canRetry?: boolean;
  testID?: string;
}

/**
 * The inline result that replaces ResultPopUp for corporate schools. It sits
 * in the footer above the buttons: a mint (correct) or orange (not quite)
 * tint with the ✓ / ✕ disc, a title, a summary line and, when correct, an
 * optional read-back. It never shows the correct answer: that stays behind
 * "Show answer".
 *
 * Screen readers: the strip is a polite live region, and the same words are
 * announced once when it appears (announceForAccessibility), so the result
 * is heard without moving focus.
 */
export default function ResultStrip({
  kind,
  correctCount,
  total,
  readBack,
  onNext,
  onShowAnswer,
  onTryAgain,
  canShowAnswer = true,
  canRetry = true,
  testID,
}: ResultStripProps) {
  const theme = useTheme();
  const { t: i18nT } = useTranslation();
  const t = i18nT as unknown as Translate;
  const tile = useTileText();
  const small = useSmallText();
  const correct = kind === 'correct';

  const input = { kind, correctCount, total };
  const title = resultTitle(kind, t);
  const summary = resultSummary(input, t);
  const spoken = resultAnnouncement({ ...input, readBack: correct ? readBack : undefined }, t);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(spoken);
    // Announce on appearance and whenever the words change.
  }, [spoken]);

  const handlers: Record<FooterActionId, (() => void) | undefined> = {
    next: onNext,
    showAnswer: onShowAnswer,
    tryAgain: onTryAgain,
  };
  const actions = footerActions(kind, { canShowAnswer, canRetry }).filter(a => handlers[a.id]);

  const tint = hexAlpha(correct ? theme.colors.success : theme.colors.error, correct ? CORRECT_TINT_ALPHA : INCORRECT_TINT_ALPHA);
  const edge = hexAlpha(correct ? theme.colors.success : theme.colors.error, correct ? 0.55 : 0.35);

  return (
    <View style={{ rowGap: 10 }}>
      <View
        testID={testID}
        accessible
        accessibilityLabel={spoken}
        accessibilityLiveRegion="polite"
        // rn-web maps this to role="status" (a polite live region).
        {...(Platform.OS === 'web' ? ({ role: 'status' } as object) : { accessibilityRole: 'summary' as const })}
        style={[
          styles.strip,
          { backgroundColor: tint, borderColor: edge, borderRadius: theme.radii.card },
        ]}>
        <ResultMark kind={kind} size={28} />
        <View style={styles.text}>
          <Text
            style={{
              fontFamily: tile.fontFamily,
              fontSize: 15,
              lineHeight: tile.km ? 24 : 20,
              // successText on the mint tint 5.0:1, errorText on the orange tint 5.05:1.
              color: correct ? theme.colors.successText : theme.colors.errorText,
            }}>
            {title}
          </Text>
          <Text
            style={{
              fontFamily: small.fontFamily,
              fontSize: 13,
              lineHeight: small.km ? 22 : 18,
              color: theme.colors.onSurface,
            }}>
            {summary}
          </Text>
          {correct && readBack ? (
            <Text
              style={{
                fontFamily: small.fontFamily,
                fontSize: 13,
                lineHeight: small.km ? 22 : 18,
                color: theme.colors.onBackground,
                marginTop: 2,
              }}>
              {t('kit.result.readBack', { text: readBack })}
            </Text>
          ) : null}
        </View>
      </View>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map(a => (
            <View key={a.id} style={{ flex: a.emphasis === 'primary' ? 1 : undefined }}>
              <AppButton
                variant={a.emphasis === 'primary' ? 'primary' : 'secondary'}
                label={t(a.labelKey)}
                onPress={handlers[a.id]}
                fullWidth={a.emphasis === 'primary'}
                testID={`result-${a.id}`}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  text: { flex: 1, rowGap: 1 },
  actions: { flexDirection: 'row', columnGap: 12, alignItems: 'center' },
});
