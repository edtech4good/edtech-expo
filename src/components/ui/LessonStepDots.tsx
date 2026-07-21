import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';
import EyebrowText from './EyebrowText';

export type StepState = 'done' | 'current' | 'todo';

export interface LessonStepDotsProps {
  steps: { learning: StepState; practice: StepState; quiz: StepState };
  showLabels?: boolean;
  dotSize?: number;
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

export default function LessonStepDots({
  steps,
  showLabels = true,
  dotSize = 6,
}: LessonStepDotsProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const colorFor = (state: StepState) => {
    if (state === 'done') return theme.colors.success;
    if (state === 'current') return theme.colors.primary;
    return theme.colors.outline;
  };

  return (
    <View
      accessibilityRole="progressbar"
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
            <EyebrowText size={8}>{t(STEP_I18N_KEYS[step])}</EyebrowText>
          )}
        </View>
      ))}
    </View>
  );
}
