import { AppButton } from '@/components';
import { QuestionColumn } from '@/components/kit';
import { Mascot } from '@/components/mascot';
import { useTypeRole } from '@/services';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { INTRO_COMPACT_HEIGHT, INTRO_START_MAX_WIDTH } from './introGate';

export interface QuizIntroProps {
  title: string;
  /** Null until the questions have loaded. */
  questionCount: number | null;
  /** True while the questions load: Start shows a spinner and does nothing. */
  loading: boolean;
  onStart: () => void;
}

/**
 * Corporate quiz intro: idle mascot, quiz name, "N questions · scored" and a
 * Start pill (same pill as the result screen's Finish). Purely presentational:
 * it submits nothing and starts no timers; QuizScreen owns the quiz state and
 * only shows question 1 after onStart.
 */
export default function QuizIntro({ title, questionCount, loading, onStart }: QuizIntroProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const titleType = useTypeRole('screenTitle');
  const body = useTypeRole('body');
  const compact = height < INTRO_COMPACT_HEIGHT;
  const headRef = useRef<View>(null);

  // Web: put keyboard and screen-reader focus on the heading when the card
  // appears (Tab then reaches Start). Native moves focus on its own.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    (headRef.current as unknown as { focus?: () => void } | null)?.focus?.();
  }, []);

  const meta =
    questionCount !== null && questionCount > 0
      ? t('screen.lesson.quizQuestions', { count: questionCount })
      : '';

  const heading = (
    <View
      ref={headRef}
      // @ts-expect-error react-native-web prop: focusable by script, not by Tab
      tabIndex={-1}
      style={[
        { alignItems: compact ? 'flex-start' : 'center' },
        // Web: a heading focused by script needs no focus ring.
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
      ]}>
      <Text
        accessibilityRole="header"
        aria-level={1}
        style={{
          fontFamily: titleType.fontFamily,
          fontSize: titleType.fontSize,
          lineHeight: titleType.lineHeight,
          color: theme.colors.onBackground,
          textAlign: compact ? 'left' : 'center',
        }}>
        {title}
      </Text>
      <Text
        testID="quiz-intro-meta"
        style={{
          marginTop: 8,
          minHeight: body.lineHeight + 2,
          fontFamily: body.fontFamily,
          fontSize: body.fontSize + 1,
          lineHeight: body.lineHeight + 2,
          color: theme.colors.onSurface,
          textAlign: compact ? 'left' : 'center',
        }}>
        {meta}
      </Text>
    </View>
  );

  const start = (
    <View style={{ width: '100%', maxWidth: INTRO_START_MAX_WIDTH, alignSelf: 'center' }}>
      <AppButton
        testID="quiz-intro-start"
        label={t('cta.start')}
        accessibilityLabel={t('corporate.quizIntro.startQuiz')}
        loading={loading}
        onPress={onStart}
        fullWidth
      />
    </View>
  );

  return (
    <ScrollView
      testID="quiz-intro"
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: compact ? 8 : theme.layouts.pageVerticalPadding,
      }}>
      <QuestionColumn>
        {compact ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            <Mascot clip="idle" compact />
            <View style={{ flexShrink: 1, maxWidth: INTRO_START_MAX_WIDTH + 40 }}>
              {heading}
              <View style={{ height: 16 }} />
              {start}
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Mascot clip="idle" gapBelow={16} />
            {heading}
            <View style={{ height: 32 }} />
            {start}
          </View>
        )}
      </QuestionColumn>
    </ScrollView>
  );
}
