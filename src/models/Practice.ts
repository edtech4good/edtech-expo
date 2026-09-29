import { QuestionOption } from './Lesson';
import type { AnswerV1 } from '../utils/answerV1';

export interface PracticeHandler {
  retry: () => void;
  submit: () => void;
  revealAnswer: () => void;
}

export interface ExerciseHandler {
  retry: () => void;
  submit: () => void;
}

// export interface Exercise

export interface PracticeAttempt {
  tries: number;
  selections: Record<string, QuestionOption>;
}

export interface DOption1Attempt {
  tries: number;
  selection: QuestionOption | undefined;
}

export interface ArrangeImageAttempt {
  tries: number;
  selections: Record<string, QuestionOption>;
  // selections: QuestionOption[];
}

export interface ArrangeTextAttempt {
  tries: number;
  // selections: Record<string, QuestionOption>;
  selections: QuestionOption[];
}

export interface FillBlankAttempt {
  tries: number;
  selections: QuestionOption[];
}

export interface FOptionAttempt {
  tries: number;
  display: string;
  answer: string;
}

export interface UserFillBlankAttept {
  tries: number;
  selections: Record<string, { option: QuestionOption; answer: string }>;
}

export interface FractionAttempt {
  tries: number;
  selections: Record<string, FractionAttemptAnswer>;
}

export interface FractionAttemptAnswer {
  option: QuestionOption;
  answer: {
    numeratorAnswer: string;
    denominatorAnswer: string;
  };
}

export interface PracticeQuestionResult {
  iscorrect: boolean;
  lessonpracticeid: string;
  lessonpracticequestionid: string;
  questionid: string;
  tries: number;
  /** The learner's response, for the server to grade. Absent on items queued by older builds. */
  answer?: AnswerV1 | null;
}

export interface PracticeResult {
  result: PracticeQuestionResult[];
  starttime: number;
  endtime?: number;
}

export interface QuizAttempt {
  selections: Record<string, QuestionOption>;
}

export interface QuizQuestionResult {
  iscorrect: boolean;
  lessonquizid: string;
  lessonquizquestionid: string;
  questionid: string;
  /** The learner's response, for the server to grade. Absent on items queued by older builds. */
  answer?: AnswerV1 | null;
}

export interface QuizResult {
  result: QuizQuestionResult[];
  starttime: number;
  endtime?: number;
}
