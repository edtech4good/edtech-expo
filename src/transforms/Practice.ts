import {
  LessonPracticeResource,
  LessonQuizResource,
  Question,
  QuestionDistractor,
  QuestionOption,
} from '@/models';
import _ from 'lodash';
import type { AnswerV1 } from '../utils/answerV1';

export const toPracticeQuestionResult = (
  isCorrect: boolean,
  tries: number,
  question: LessonPracticeResource,
  answer?: AnswerV1 | null,
) => ({
  iscorrect: isCorrect,
  tries,
  lessonpracticeid: question.lessonpracticeid,
  lessonpracticequestionid: question.lessonpracticequestionid,
  questionid: question.questionid,
  // Omitted (not undefined-valued) when the renderer gave no answer.
  ...(answer !== undefined ? { answer } : {}),
});

export const toQuizQuestionResult = (
  isCorrect: boolean,
  question: LessonQuizResource,
  answer?: AnswerV1 | null,
) => ({
  iscorrect: isCorrect,
  lessonquizid: question.lessonquizid,
  lessonquizquestionid: question.lessonquizquestionid,
  questionid: question.questionid,
  ...(answer !== undefined ? { answer } : {}),
});

export const fromQuestionDistractorToQuestionOption = (
  qd: QuestionDistractor[],
) =>
  _.map(
    qd,
    q =>
      ({
        questionoptionid: q.questiondistractorid,
        questionoptiontext: q.questiondistractortext,
        questionoptioniscorrect: false,
      } as QuestionOption),
  ) as QuestionOption[];

export const fillInTheBlank = (
  textToBeFilled: string,
  textForFilling: QuestionOption[],
) => {
  if (_.isEmpty(textForFilling))
    return (textToBeFilled ?? '').replaceAll('-----', ' _____ ');
  return _.reduce(
    textForFilling,
    (result, value) => {
      result = result.replace(' _____ ', ` ${value.questionoptiontext} `);
      return result;
    },
    textToBeFilled.replaceAll('-----', ' _____ '),
  );
};

// export const fillInTheBlankWithInput = (
//   textToBeFilled: string,
//   inputBox: QuestionOption[],
// ) => {
//   const splittedText = textToBeFilled.split('-----');

//   return _.map(splittedText, (st, index) => {
//     if(index === 0) return st;
//     return `${<Form} ${st}`
//   });

//   // return _.reduce(
//   //   inputBox,
//   //   (result, value) => {
//   //     result = result.replace('-----', <FormInput />);
//   //   },
//   //   textToBeFilled,
//   // );
// };
