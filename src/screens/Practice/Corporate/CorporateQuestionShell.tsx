import {
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { PracticeHandler, QuestionHeading } from '@/models';
import { useFont, useResource } from '@/services';
import AppButton from '@/components/ui/AppButton';
import RefreshIcon from '@/components/ui/icons/RefreshIcon';
import ListenPill from '@/components/kit/ListenPill';
import QuestionColumn from '@/components/kit/QuestionColumn';
import ResultStrip from '@/components/kit/ResultStrip';
import { useSmallText } from '@/components/kit/kitText';
import type { PracticeProps } from '../PracticeScreen';
import {
  INITIAL_SHELL_STATE,
  retried,
  revealed,
  ShellAction,
  ShellActionId,
  shellFooterActions,
  shellPress,
  ShellState,
  stripKind,
} from './shellLogic';
import type { QuestionBody, QuestionBodyReport } from './types';

export interface CorporateQuestionShellProps extends PracticeProps {
  /** The type-specific part: see types.ts and README.md. */
  Body: QuestionBody;
}

/**
 * The corporate question frame every rebuilt type shares: the 760 column,
 * the question card (heading text and its Listen pill), the body, the inline
 * result strip in place of ResultPopUp, and the footer.
 *
 * It makes the same calls today's renderers make (see shellLogic.ts), so the
 * screens record, retry and move on exactly as before. Corporate schools
 * only: the registry never gives it to a kids-theme school.
 */
export default forwardRef<PracticeHandler, CorporateQuestionShellProps>(
  function CorporateQuestionShell(props, ref) {
    // A fresh shell (tries, result, the body's answer) for every question.
    // The screens key the renderer on `questionnid`, which the student API
    // does not send, so the same renderer instance can see the next
    // question; today's renderers reset on the index for the same reason.
    return (
      <QuestionShell key={props.currentQuestionIndex} ref={ref} {...props} />
    );
  },
);

const QuestionShell = forwardRef<PracticeHandler, CorporateQuestionShellProps>(
  function QuestionShell(
    {
      Body,
      question,
      mode = 'practice',
      hideRetry = false,
      onSubmit = () => undefined,
      onContinue = () => undefined,
    },
    ref,
  ) {
    const theme = useTheme();
    const { t } = useTranslation();
    const headingFont = useFont('bold', 'display');
    const small = useSmallText();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

    const [state, setState] = useState<ShellState>(INITIAL_SHELL_STATE);
    const [ready, setReady] = useState(false);
    const reportRef = useRef<QuestionBodyReport | null>(null);

    const report = useCallback((r: QuestionBodyReport) => {
      reportRef.current = r;
      setReady(r.ready);
    }, []);

    // Today's handle, so the screens' practiceRef keeps working.
    useImperativeHandle(
      ref,
      () => ({
        retry() {
          setState(s => retried(s));
        },
        submit() {
          press('submit');
        },
        revealAnswer() {
          setState(s => revealed(s));
        },
      }),
    );

    const heading = _.get(
      question,
      'questionobject.questionheading',
      {},
    ) as QuestionHeading;
    const headingAudio = useResource(
      { name: _.get(heading, 'headingfile.filename', '') },
      [heading],
    );

    const feedback = question?.questionobject?.questionfeedback;

    const press = (id: ShellActionId) => {
      const result = shellPress(state, id, {
        mode,
        ready,
        hideRetry,
        evaluate: () =>
          reportRef.current
            ? reportRef.current.evaluate()
            : { iscorrect: false, answer: null, perItem: {} },
      });
      if (result.state !== state) setState(result.state);
      const effect = result.effect;
      switch (effect.kind) {
        case 'submit':
          onSubmit(effect.tries, effect.iscorrect, false, effect.answer, {
            inlineResult: true,
          });
          break;
        case 'skipRevealed':
          onSubmit(effect.tries, false, true);
          break;
        case 'continue':
          onContinue();
          break;
        default:
          break;
      }
    };

    const actions = shellFooterActions({
      mode,
      resultState: state.resultState,
      tries: state.tries,
      ready,
      hideRetry,
    });
    const kind = stripKind(state);
    const summary = state.evaluation?.summary;
    const message =
      kind === 'correct'
        ? feedback?.correctmessage || undefined
        : kind === 'incorrect'
          ? feedback?.incorrectmessage || undefined
          : undefined;

    // As PracticeFooter: the bottom tab bar (phone) already reserves the
    // safe-area inset, and iOS's SafeAreaView pads it too.
    const safeBottomPadding =
      tabBarHeight > 0 || Platform.OS === 'ios' ? 0 : insets.bottom;

    const renderButton = (a: ShellAction, _i: number, all: ShellAction[]) => {
      const primary = a.emphasis === 'primary';
      // A button on its own fills the row (Show answer on the last try).
      const fill = primary || all.length === 1;
      const testID =
        a.id === 'submit'
          ? 'footer-submit'
          : a.id === 'retry'
            ? 'footer-retry'
            : `result-${a.id}`;
      return (
        <View key={a.id} style={fill ? { flex: 1 } : undefined}>
          <AppButton
            testID={testID}
            label={t(a.labelKey)}
            variant={primary ? 'primary' : 'secondary'}
            size="lg"
            fullWidth={fill}
            disabled={a.disabled}
            icon={
              a.id === 'retry' ? (
                <RefreshIcon color={theme.colors.primary} />
              ) : undefined
            }
            onPress={() => press(a.id)}
          />
        </View>
      );
    };

    // Submit and Retry keep today's order (Submit first). After a result the
    // secondary action (Show answer) leads and the primary one fills the row.
    const ordered =
      state.resultState === 'answering'
        ? actions
        : [
            ...actions.filter(a => a.emphasis === 'secondary'),
            ...actions.filter(a => a.emphasis === 'primary'),
          ];

    return (
      <View
        style={{
          flex: 1,
          alignSelf: 'stretch',
          backgroundColor: theme.colors.background,
        }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: theme.layouts.large }}>
          <QuestionColumn>
            <View
              testID="question-card"
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.card,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                paddingHorizontal: 20,
                paddingVertical: 20,
                rowGap: 14,
                alignItems: 'center',
              }}>
              <ListenPill
                testID="question-listen"
                clipId={`question-${_.get(question, 'questionid', '')}`}
                source={_.isEmpty(heading.headingfile) ? '' : headingAudio}
              />
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: headingFont,
                  fontSize: theme.fontSizes.subtitle,
                  // Khmer marks need the taller leading (design v2.1).
                  lineHeight: small.km
                    ? theme.fontSizes.subtitle * 1.65
                    : undefined,
                  color: theme.colors.onBackground,
                  textAlign: 'center',
                }}>
                {heading.headingtext}
              </Text>
            </View>
            <View style={{ height: 16 }} />
            <Body
              question={question}
              mode={mode}
              tries={state.tries}
              resetKey={state.resetKey}
              resultState={state.resultState}
              disabled={state.resultState !== 'answering'}
              marks={
                state.resultState === 'correct' ||
                state.resultState === 'incorrect'
                  ? state.evaluation?.perItem ?? {}
                  : null
              }
              showAnswer={state.resultState === 'revealed'}
              report={report}
            />
          </QuestionColumn>
        </ScrollView>
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            paddingBottom: safeBottomPadding,
          }}>
          <QuestionColumn
            style={{ paddingVertical: theme.layouts.large, rowGap: 10 }}>
            {kind ? (
              <ResultStrip
                testID="result-strip"
                kind={kind}
                correctCount={summary?.correctCount}
                total={summary?.total}
                readBack={summary?.readBack}
                message={message}
              />
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: 12,
              }}>
              {ordered.map(renderButton)}
            </View>
          </QuestionColumn>
        </View>
      </View>
    );
  },
);
