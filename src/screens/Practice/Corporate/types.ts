// The contract between CorporateQuestionShell and a question body. See
// README.md in this folder. Types only, so the pure logic and its tests can
// import it in plain node.
import type { ComponentType } from 'react';
import type { Question } from '../../../models/Lesson';
import type { AnswerV1 } from '../../../utils/answerV1';

/** Which screen hosts the question: practice (retries) or quiz (one attempt). */
export type QuestionMode = 'practice' | 'quiz';

/**
 * Where the question is in its life:
 * - answering: the learner is working on it; Submit is enabled when the body is ready.
 * - correct / incorrect: submitted; the body shows `marks`, the result strip shows.
 * - revealed: practice only, after "Show answer"; the body shows the right answer.
 */
export type ResultState = 'answering' | 'correct' | 'incorrect' | 'revealed';

/** One item's result mark, keyed by the body's own item id (usually an option id). */
export type ItemMark = 'correct' | 'incorrect';

/** What `evaluate()` returns when the learner taps Submit. */
export interface QuestionEvaluation {
  /** Sent as `iscorrect`. Must equal what today's renderer computes for the same answer. */
  iscorrect: boolean;
  /** Sent as `answer`. Build it with the `answerV1` builder today's renderer uses. */
  answer: AnswerV1 | null;
  /** ✓ / ✕ per item, shown after submit. Leave out items that get no mark. */
  perItem: Record<string, ItemMark>;
  /**
   * The result strip's counts ("2 of 4 are in the right place."). Leave
   * `total` out, or 1, for a question without parts (multiple choice).
   * `readBack` is the finished answer read back in the correct strip (the
   * sentence, for word ordering).
   */
  summary?: { correctCount?: number; total?: number; readBack?: string };
}

/** What a body reports to the shell, every time its answer changes. */
export interface QuestionBodyReport {
  /**
   * Whether Submit is enabled. Matching and fill in the blank: every slot or
   * blank is filled. Ordering: always true. Multiple choice: always true
   * (today's footer never blocks Submit; an empty answer grades as wrong).
   */
  ready: boolean;
  /** Called once, when the learner taps Submit. Must not change state. */
  evaluate: () => QuestionEvaluation;
}

/** The props the shell gives a body. */
export interface QuestionBodyProps {
  question: Question;
  mode: QuestionMode;
  /**
   * Today's attempt counter, starting at 1. It goes up on Retry and on Try
   * again. Bodies that shuffle per attempt key the shuffle on it, as today's
   * renderers do.
   */
  tries: number;
  /** Goes up whenever the answer must be cleared (Retry, Try again). */
  resetKey: number;
  resultState: ResultState;
  /** True once submitted or revealed: the body takes no more input. */
  disabled: boolean;
  /** The marks from the last `evaluate()`, while the result shows; otherwise null. */
  marks: Record<string, ItemMark> | null;
  /** True after "Show answer": render the correct answer. */
  showAnswer: boolean;
  /**
   * Report readiness and how to grade. Call it through `useReportAnswer`
   * (it keeps `evaluate` current without re-reporting every render).
   */
  report: (report: QuestionBodyReport) => void;
}

export type QuestionBody = ComponentType<QuestionBodyProps>;

/**
 * The fifth argument of PracticeProps.onSubmit. `inlineResult` means the
 * renderer shows the result itself (the corporate shell's strip), so the
 * screen records the result exactly as before but does not open the
 * ResultPopUp; the renderer calls `onContinue` for the popup's button.
 */
export interface SubmitOptions {
  inlineResult?: boolean;
}
