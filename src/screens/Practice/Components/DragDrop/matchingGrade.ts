// How a matching answer (template 7) is graded on the device and what is sent
// with it. Moved here unchanged from PracticeDragDrop's submit handler so the
// kids renderer and the corporate one (Corporate/Matching) share one rule, and
// so it runs in plain node (`yarn test:answer`, `yarn test:matching`).
import _ from 'lodash';
import { matchAnswer, type AnswerV1 } from '../../../../utils/answerV1';

/** The slice of a QuestionOption the grading reads. */
export interface MatchedOption {
  questionoptionid: string;
}

/**
 * What the renderers hold: drop-target option id -> id of the option placed
 * on it. A target with nothing on it is '' or missing.
 */
export type MatchAnswers = Record<string, string | undefined>;

export interface MatchGrade {
  isCorrect: boolean;
  answer: AnswerV1 | null;
}

/**
 * Correct when every option has its own id placed on it (each prompt holds
 * its own answer). A target left empty is wrong and is not sent.
 */
export function gradeMatching(
  questionOptions: ReadonlyArray<MatchedOption> | null | undefined,
  answers: MatchAnswers,
): MatchGrade {
  const isCorrect = _.reduce(
    questionOptions as MatchedOption[],
    (result, value) => {
      if (
        _.isEmpty(answers[value.questionoptionid]) ||
        answers[value.questionoptionid] !== value.questionoptionid
      )
        result = false;

      return result;
    },
    true,
  );
  // Keys are drop targets, values the option placed on each.
  return { isCorrect, answer: matchAnswer(answers) };
}
