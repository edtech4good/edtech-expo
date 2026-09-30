// How a multiple-choice text answer (templates 1 and 3) is graded on the
// device and what is sent with it. Moved here unchanged from
// PracticeMCQText's submit handler so the kids renderer and the corporate
// one (screens/Practice/Corporate/MCQText) share one rule, and so it runs in
// plain node (`yarn test:answer`, `yarn test:shell`).
import _ from 'lodash';
import { choiceAnswer, type AnswerV1 } from '../../../../utils/answerV1';

/** The slice of a QuestionOption the grading reads. */
export interface GradedOption {
  questionoptionid: string;
  questionoptioniscorrect: boolean;
}

/**
 * The learner's selections as the renderers hold them: option id -> the
 * option (or anything non-empty) when selected. An empty value counts as
 * not selected. Key order is selection order, and is the order sent.
 */
export type McqSelections = Record<string, unknown>;

export interface McqTextGrade {
  isCorrect: boolean;
  answer: AnswerV1 | null;
}

/**
 * Correct when every correct option is selected and no incorrect one is.
 * Several selections are allowed on both templates (today's behaviour).
 */
export function gradeMcqText(
  questionOptions: ReadonlyArray<GradedOption> | null | undefined,
  selections: McqSelections,
): McqTextGrade {
  const { isCorrect } = _.reduce(
    questionOptions as GradedOption[],
    (result, value) => {
      if (
        value.questionoptioniscorrect &&
        _.isEmpty(selections[value.questionoptionid])
      )
        result.isCorrect = false;
      else if (
        !value.questionoptioniscorrect &&
        !_.isEmpty(selections[value.questionoptionid])
      )
        result.isCorrect = false;
      return result;
    },
    {
      isCorrect: true,
    },
  );

  return {
    isCorrect,
    answer: choiceAnswer(_.keys(_.pickBy(selections, v => !_.isEmpty(v)))),
  };
}
