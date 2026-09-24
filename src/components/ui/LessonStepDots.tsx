import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';
import EyebrowText from './EyebrowText';

export type StepState = 'done' | 'current' | 'todo';

export interface LessonStepDotsProps {
  steps: { learning: StepState; practice: StepState; quiz: StepState };
  showLabels?: boolean;
  dotSize?: number;
  /**
   * F-05: When false, the component is embedded in an accessible parent (LessonRow);
   * render as a non-accessible container to avoid duplicate announcements.
   * When true (default), render as a standalone accessible progressbar for dev gallery/other use.
   */
  standalone?: boolean;
}

// screen.lesson.{learningTitle,practiceTitle,quizTitle} already exist in
// src/locales/en.json ("Learning"/"Practice"/"Quiz") and km.json — reused
// here instead of introducing new keys. EyebrowText uppercases English on
// its own, so no need to shout in the translation source string itself.
const STEP_ORDER: Array<keyof LessonStepDotsProps['steps']> = [
  'learning',
  'practice',
  'quiz',
];

const STEP_I18N_KEYS: Record<keyof LessonStepDotsProps['steps'], string> = {
  learning: 'screen.lesson.learningTitle',
  practice: 'screen.lesson.practiceTitle',
  quiz: 'screen.lesson.quizTitle',
};

/**
 * F-05: Build an accessible text description of step states for screen readers.
 * Converts step states (done/current/todo) to a readable format:
 * "Learning (done), Practice (in progress), Quiz (not started)".
 * Used in LessonRow's accessibility label and when LessonStepDots is standalone.
 */
export function describeSteps(
  steps: LessonStepDotsProps['steps'],
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return STEP_ORDER.map(step => {
    const stepName = t(STEP_I18N_KEYS[step]);
    const state = steps[step];
    const stateText = t(`screen.level.stepState.${state}`);
    return t('screen.level.stepFormat', { step: stepName, state: stateText });
  }).join(', ');
}

export default function LessonStepDots({
  steps,
  showLabels = true,
  dotSize = 6,
  standalone = true,
}: LessonStepDotsProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const colorFor = (state: StepState) => {
    if (state === 'done') return theme.colors.success;
    if (state === 'current') return theme.colors.primary;
    return theme.colors.outline;
  };

  // F-05: When rendered standalone (outside LessonRow), provide an
  // accessible label describing the step states. Inside LessonRow the row's
  // own label already says all of this, so the dots must not be a second
  // node: dropping role/label is what fixes web, importantForAccessibility
  // hides the subtree on Android, accessibilityElementsHidden on iOS.
  const stepDescription = describeSteps(steps, t);

  return (
    <View
      accessible={standalone}
      accessibilityRole={standalone ? 'progressbar' : undefined}
      accessibilityLabel={standalone ? stepDescription : undefined}
      importantForAccessibility={!standalone ? 'no-hide-descendants' : undefined}
      accessibilityElementsHidden={!standalone}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      {STEP_ORDER.map(step => (
        <View key={step} style={{ alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colorFor(steps[step]),
            }}
          />
          {showLabels && (
            // Handoff: mono 8px step labels; exempt from the 12px English floor (U-19).
            <EyebrowText size={8} floor={false}>
              {t(STEP_I18N_KEYS[step])}
            </EyebrowText>
          )}
        </View>
      ))}
    </View>
  );
}
