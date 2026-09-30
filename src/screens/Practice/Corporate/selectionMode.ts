// Single or multiple selection for corporate multiple choice (templates 1
// to 4). No react-native imports (tested in plain node).
//
// Templates 1 and 2 are the single-answer ones (text and pictures). In
// corporate schools they are single-select: tapping an option replaces the
// one chosen before, and the options are radios. Templates 3 and 4 keep
// multiple selection (checkboxes). Kids renderers are unchanged: they let
// several options be chosen on every template.
//
// Grading does not change. A single selection is a selections object with
// one key, graded by the same gradeMcqText, so for the same final choice
// `iscorrect` and the answer are exactly what the kids path sends.
import _ from 'lodash';

import { TemplateTypeId } from '../../../constants/QuestionTemplate';
import { toggleSelection } from './mcqTextLogic';

export type SelectionMode = 'single' | 'multi';

/** The single-answer templates: multiple choice text (1) and pictures (2). */
export const SINGLE_ANSWER_TEMPLATES: readonly number[] = [
  TemplateTypeId.MCQSingleText,
  TemplateTypeId.MCQSingleImage,
];

/** The slice of a question this reads. */
export interface SelectionQuestion {
  questionobject?: {
    questionoptions?: ReadonlyArray<{ questionoptioniscorrect?: boolean }> | null;
  } | null;
}

/**
 * 'single' for templates 1 and 2, 'multi' otherwise.
 *
 * Safety: a template 1 or 2 question with more than one correct option is
 * bad data (the template promises one answer), but single-select would make
 * it impossible to answer correctly, since the grade needs every correct
 * option chosen. Such a question keeps multiple selection so it stays
 * answerable. None exist on UAT today; prod has not been checked.
 */
export function selectionModeFor(
  templateId: number,
  question: SelectionQuestion | null | undefined,
): SelectionMode {
  if (!SINGLE_ANSWER_TEMPLATES.includes(templateId)) return 'multi';
  const options = question?.questionobject?.questionoptions ?? [];
  const correct = options.filter(o => o?.questionoptioniscorrect).length;
  return correct > 1 ? 'multi' : 'single';
}

/**
 * Apply a tap. Multi: toggle the option (today's rule). Single: the tapped
 * option becomes the only one chosen; tapping the chosen option again keeps
 * it (a radio does not unselect itself).
 */
export function selectOption<T>(
  selections: Readonly<Record<string, T>>,
  id: string,
  value: T,
  mode: SelectionMode,
): Record<string, T> {
  if (mode === 'multi') return toggleSelection(selections, id, value);
  const keys = Object.keys(selections).filter(k => !_.isEmpty(selections[k]));
  if (keys.length === 1 && keys[0] === id) return selections as Record<string, T>;
  return { [id]: value };
}

/** The accessibility roles for a mode: radios in a radiogroup, or checkboxes in a group. */
export function selectionRoles(mode: SelectionMode): {
  group: 'radiogroup' | 'group';
  option: 'radio' | 'checkbox';
} {
  return mode === 'single'
    ? { group: 'radiogroup', option: 'radio' }
    : { group: 'group', option: 'checkbox' };
}
