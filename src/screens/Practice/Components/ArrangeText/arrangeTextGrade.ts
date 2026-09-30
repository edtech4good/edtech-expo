// How a word-ordering answer (template 5) is graded on the device and what
// is sent with it. Moved here unchanged from PracticeArrangeText's submit
// handler so the kids renderer and the corporate one
// (screens/Practice/Corporate/TextOrdering) share one rule, and so it runs
// in plain node (`yarn test:answer`, `yarn test:ordering`).
import _ from 'lodash';
import { orderAnswer, type AnswerV1 } from '../../../../utils/answerV1';

/** The slice of a QuestionOption the grading reads. */
export interface OrderedOption {
  questionoptionid: string;
  questionoptionsequence: number;
}

export interface ArrangeTextGrade {
  isCorrect: boolean;
  answer: AnswerV1 | null;
}

/**
 * Correct when every option has been placed (`selections` as long as
 * `options`) and the sequences never go down along the learner's order
 * (equal sequences may sit in either order). `answer` is the learner's ids
 * in the order placed.
 */
export function gradeArrangeText(
  options: ReadonlyArray<unknown> | null | undefined,
  selections: ReadonlyArray<OrderedOption>,
): ArrangeTextGrade {
  let isCorrect = true;
  if (Object.values(selections).length !== (options ?? []).length) isCorrect = false;
  else {
    const answers = Object.values(selections);

    const { correct } = _.reduce(
      answers,
      (result, value) => {
        if (value.questionoptionsequence < result.currentSequence)
          result.correct = false;
        result.currentSequence = value.questionoptionsequence;
        return result;
      },
      { correct: true, currentSequence: 0 },
    );
    isCorrect = correct;
  }

  return {
    isCorrect,
    answer: orderAnswer(_.map(selections, o => o.questionoptionid)),
  };
}
