// How a picture-ordering answer (template 6) is graded on the device and what
// is sent with it. Moved here unchanged from PracticeArrangeImage's submit
// handler so the kids renderer and the corporate one
// (screens/Practice/Corporate/ImageOrdering) share one rule, and so it runs in
// plain node (`yarn test:answer`, `yarn test:image-ordering`).
import _ from 'lodash';
import { orderAnswer, type AnswerV1 } from '../../../../utils/answerV1';

/** The slice of a QuestionOption the grading reads. */
export interface OrderedOption {
  questionoptionid: string;
  questionoptionsequence: number;
}

export interface ArrangeImageGrade {
  correct: boolean;
  answer: AnswerV1 | null;
}

/**
 * `options` are the pictures in the order the learner left them. Correct when
 * no picture has a lower sequence than the one before it (equal sequences are
 * allowed, and the first is compared with 0), which is today's rule. The
 * answer sent is the ids in that order.
 */
export function gradeArrangeImage(
  options: ReadonlyArray<OrderedOption> | null | undefined,
): ArrangeImageGrade {
  const { correct } = _.reduce(
    options as OrderedOption[],
    (result, value) => {
      if (value.questionoptionsequence < result.currentSequence)
        result.correct = false;
      result.currentSequence = value.questionoptionsequence;
      return result;
    },
    { correct: true, currentSequence: 0 },
  );
  return {
    correct,
    answer: orderAnswer(_.map(options, o => o.questionoptionid)),
  };
}
