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
  if (opts.showAnswer) return option.questionoptioniscorrect ? 'correct' : 'default';
  if (opts.marks) return opts.marks[option.questionoptionid] ?? 'default';
  return opts.selected ? 'selected' : 'default';
}
