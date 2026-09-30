// How a fill in the blank answer (template 8) is graded on the device and
// what is sent with it. Moved here unchanged from PracticeFillBlank's submit
// handler so the kids renderer and the corporate one
// (screens/Practice/Corporate/FillBlank) share one rule, and so it runs in
// plain node (`yarn test:fillblank`, `yarn test:answer`).
import _ from 'lodash';
import { blanksAnswer, type AnswerV1 } from '../../../../utils/answerV1';

/** The slice of a QuestionOption the grading reads. */
export interface FillBlankOption {
  questionoptionid: string;
  questionoptioniscorrect?: boolean;
  questionoptionsequence?: number;
}

export interface FillBlankGrade {
  isCorrect: boolean;
  answer: AnswerV1 | null;
}

/**
 * `questionOptions` are the question's real options (the ones that belong in
 * the blanks); `selections` are the tiles the learner placed, in blank order
 * (distractors keep their own ids and are not in `questionOptions`).
 *
 * Correct when every blank is filled and, going through the blanks in order,
 * the sequence never goes backwards and (with more than one blank) every tile
 * is a correct option. A distractor has no sequence, so it is always wrong.
 */
export function gradeFillBlank(
  questionOptions: ReadonlyArray<unknown> | null | undefined,
  selections: ReadonlyArray<FillBlankOption>,
): FillBlankGrade {
  const required = (questionOptions ?? []).length;
  let isCorrect = false;

  if (selections.length < required) isCorrect = false;
  else {
    const { correct } = _.reduce(
      selections,
      (result, value) => {
        if (
          (!_.isBoolean(value.questionoptioniscorrect) && required > 1) ||
          !_.isNumber(value.questionoptionsequence)
        ) {
          result.correct = false;
        } else if (value.questionoptionsequence < result.currentSequence) {
          result.correct = false;
        } else if (!value.questionoptioniscorrect && required > 1) {
          result.correct = false;
        }

        result.currentSequence = value.questionoptionsequence as number;
        return result;
      },
      { correct: true, currentSequence: 0 },
    );
    isCorrect = correct;
  }

  return {
    isCorrect,
    answer: blanksAnswer(_.map(selections, o => o.questionoptionid)),
  };
}
