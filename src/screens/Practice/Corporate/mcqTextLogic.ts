// Corporate multiple choice, text (templates 1 and 3): grading and marks.
// No react-native imports (tested in plain node).
//
// Grading is today's rule (gradeMcqText, shared with the kids renderer), so
// `iscorrect` and `answer` are what the kids path sends for the same
// selections, in the same order.
import _ from 'lodash';
import {
  GradedOption,
  gradeMcqText,
  McqSelections,
} from '../Components/MCQText/mcqTextGrade';
import type { ItemMark, QuestionEvaluation } from './types';

/** Tap an option: select it, or unselect it. Selection order is kept. */
export function toggleSelection<T>(
  selections: Readonly<Record<string, T>>,
  id: string,
  value: T,
): Record<string, T> {
  if (!_.isEmpty(selections[id])) return _.omit(selections, id) as Record<string, T>;
  return { ...selections, [id]: value };
}

/**
 * Submit: today's grade, plus a mark on each chosen option (its own
 * correctness). Options that were not chosen get no mark, so a wrong answer
 * does not reveal the right one: that stays behind "Show answer".
 */
export function evaluateMcqText(
  options: ReadonlyArray<GradedOption> | null | undefined,
  selections: McqSelections,
): QuestionEvaluation {
  const { isCorrect, answer } = gradeMcqText(options, selections);
  const perItem: Record<string, ItemMark> = {};
  for (const o of options ?? []) {
    if (_.isEmpty(selections[o.questionoptionid])) continue;
    perItem[o.questionoptionid] = o.questionoptioniscorrect ? 'correct' : 'incorrect';
  }
  return { iscorrect: isCorrect, answer, perItem };
}

/** The narrowest a compact option's card gets (its label wraps below this). */
export const COMPACT_OPTION_MIN_WIDTH = 150;

/**
 * Columns for the options on a short screen (layout.compact): as many as
 * fit across `availableWidth`, so the options take as few rows as possible
 * and stay above the footer. `trailing` is the width beside each card (the
 * audio circle and its gap), 0 when no option has audio.
 */
export function compactColumns(
  count: number,
  availableWidth: number,
  gap: number,
  trailing: number,
): number {
  const per = COMPACT_OPTION_MIN_WIDTH + trailing;
  const fit = Math.floor((availableWidth + gap) / (per + gap));
  return Math.max(1, Math.min(count, fit));
}

export type McqOptionState = 'default' | 'selected' | 'correct' | 'incorrect';

/** How one option looks: the answer when shown, else its mark, else selection. */
export function mcqOptionState(
  option: GradedOption,
  opts: {
    selected: boolean;
    marks: Readonly<Record<string, ItemMark>> | null;
    showAnswer: boolean;
  },
): McqOptionState {
  if (opts.showAnswer)
    return option.questionoptioniscorrect ? 'correct' : 'default';
  if (opts.marks) return opts.marks[option.questionoptionid] ?? 'default';
  return opts.selected ? 'selected' : 'default';
}

/**
 * The locale key that adds the result to a text option's name for a screen
 * reader, or null while answering. The wording is the picture choice's
 * ("Circle, correct"), so both read the same. The right answer shown by
 * "Show answer" says "correct answer": it was not the learner's choice.
 */
export function mcqResultLabelKey(
  state: McqOptionState,
  showAnswer: boolean,
):
  | 'corporate.mcqImage.correct'
  | 'corporate.mcqImage.correctAnswer'
  | 'corporate.mcqImage.incorrect'
  | null {
  if (state === 'correct')
    return showAnswer ? 'corporate.mcqImage.correctAnswer' : 'corporate.mcqImage.correct';
  if (state === 'incorrect') return 'corporate.mcqImage.incorrect';
  return null;
}
