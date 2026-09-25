import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useFont } from '@/services';

export type StepState = 'done' | 'current' | 'todo';

/**
 * v2.1: a lesson can hold more than one item per type (e.g. two Practice
 * sets). `done`/`total` let the dot's label show progress ("Practice
 * 1/2"); `total` defaults to 1, and the count is only shown when it's
 * greater than 1 (a plain "1/1" would be noise). `state` still drives the
 * dot fill/label color and is derived from the items of that type: done
 * when every item is done, current if any item has been started.
 */
export interface StepInfo {
  state: StepState;
  done?: number;
  total?: number;
}

/** Either a bare state (the pre-v2.1 shape, still used by the level screen's
 * coarse `approximateSteps` estimate) or a full `StepInfo` with counts. */
export type StepInput = StepState | StepInfo;

export interface LessonStepDotsProps {
  steps: { learning: StepInput; practice: StepInput; quiz: StepInput };
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
// here instead of introducing new keys.
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

// Exported for reuse by LevelSelectionScreen, which needs the same
// bare-state/full-StepInfo normalization to derive a lesson's status.
export function toStepInfo(input: StepInput): Required<StepInfo> {
  if (typeof input === 'string') return { state: input, done: 0, total: 1 };
  return { state: input.state, done: input.done ?? 0, total: input.total ?? 1 };
}

/**
 * F-05: Build an accessible text description of step states for screen readers.
 * Converts step states (done/current/todo) to a readable format:
 * "Learning (done), Practice (in progress, 1 of 2), Quiz (not started)".
 * Used in LessonRow's accessibility label and when LessonStepDots is standalone.
 */
export function describeSteps(
  steps: LessonStepDotsProps['steps'],
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return STEP_ORDER.filter(step => toStepInfo(steps[step]).total > 0)
    .map(step => {
      const stepName = t(STEP_I18N_KEYS[step]);
      const { state, done, total } = toStepInfo(steps[step]);
      const stateText = t(`screen.level.stepState.${state}`);
      return total > 1
        ? t('screen.level.stepFormatWithCount', {
            step: stepName,
            state: stateText,
            done,
            total,
          })
        : t('screen.level.stepFormat', { step: stepName, state: stateText });
    })
    .join(', ');
}

export default function LessonStepDots({
  steps,
  showLabels = true,
  dotSize = 8,
  standalone = true,
}: LessonStepDotsProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const labelFontFamily = useFont('normal', 'body');
  const labelFontFamilySemi = useFont('semi', 'body');

  const dotStyleFor = (state: StepState) => {
    if (state === 'done')
      return { backgroundColor: theme.colors.successText, borderWidth: 0 };
    if (state === 'current')
      return { backgroundColor: theme.colors.primary, borderWidth: 0 };
    // todo: hollow ring, 1.5px onSurfaceVariant outline, no fill. `outline`
    // (#CDD5E0, ~1.4:1 on white) fails contrast — onSurfaceVariant is the
    // corporate ring/border color per the v2 handoff (#5A6B80).
    return {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.colors.onSurfaceVariant,
    };
  };

  const labelColorFor = (state: StepState) => {
    if (state === 'current') return theme.colors.primary;
    if (state === 'todo') return theme.colors.onSurfaceVariant;
    // done: "normal label" per the handoff — the dot alone carries the
    // green, the label stays the row's default (body) text color.
    return theme.colors.onSurface;
  };

  const labelFontFamilyFor = (state: StepState) =>
    state === 'current' ? labelFontFamilySemi : labelFontFamily;

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
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
      {STEP_ORDER.filter(step => toStepInfo(steps[step]).total > 0).map(step => {
        const { state, done, total } = toStepInfo(steps[step]);
        const label =
          total > 1
            ? `${t(STEP_I18N_KEYS[step])} ${done}/${total}`
            : t(STEP_I18N_KEYS[step]);
        return (
          <View
            key={step}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={[
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                },
                dotStyleFor(state),
              ]}
            />
            {showLabels && (
              // Handoff v2 §7: step-dot labels moved from mono 8px to Plus
              // Jakarta 12px (U-19's 12pt floor has no exceptions anymore).
              <Text
                style={{
                  fontFamily: labelFontFamilyFor(state),
                  fontSize: 12,
                  color: labelColorFor(state),
                }}>
                {label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
