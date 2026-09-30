// The corporate question shell's rules, with no react-native imports so they
// run in plain node (`yarn test:shell`). CorporateQuestionShell.tsx only
// renders what these return and performs the effect of each press.
//
// The semantics are today's, read from PracticeScreen, QuizScreen and the
// renderers (PracticeMCQText is the reference):
// - A question starts at tries = 1.
// - Submit sends onSubmit(tries, iscorrect, false, answer). Practice records
//   the result only when it is correct; quiz records every submission.
// - Retry (the footer pill, before submitting) clears the answer and counts
//   an attempt: the footer passes its press event as the renderer's
//   `chargeAttempt` argument, which is truthy, so today's Retry adds a try.
// - Try again (practice, after a wrong answer) clears the answer and adds a
//   try: it is what practiceRef.retry() does after the popup.
// - Today's popup forces "Show answer" once tries > 2, so a learner gets at
//   most three attempts. The inline footer keeps that cap: Try again is
//   offered while tries <= 2; Show answer is offered after any wrong answer.
// - After Show answer, Next sends onSubmit(tries, false, true) with no
//   answer: the screen moves on without recording anything, as today.
// - Quiz has one attempt: after any answer, Next moves on (what the popup's
//   only button did).
import { footerActions } from '../../../components/kit/resultLogic';
import type {
  QuestionEvaluation,
  QuestionMode,
  ResultState,
} from './types';

/** Today's cap: the popup forces "Show answer" once tries > 2. */
export const MAX_PRACTICE_TRIES = 3;

/**
 * How long a freshly shown question ignores taps. The second tap of a quick
 * double tap on Next lands where the next question's Submit now sits (the
 * footer does not move), and multiple choice is ready at once, so without
 * this it would submit a blank answer on the new question. Readiness cannot
 * be the guard: a body may be ready immediately. 500 ms covers a double tap
 * (OS double-tap windows are 300 to 500 ms) and is shorter than anyone
 * reads a new question and answers it.
 */
export const ARM_MS = 500;

/** Whether a question shown at `mountedAt` accepts taps at `now`. */
export function pressArmed(mountedAt: number, now: number): boolean {
  return now - mountedAt >= ARM_MS;
}

export interface ShellState {
  tries: number;
  resetKey: number;
  resultState: ResultState;
  evaluation: QuestionEvaluation | null;
  /**
   * Next was pressed: the screen is moving on (and may be saving the whole
   * practice or quiz). Every button is disabled and every press ignored
   * until the next question mounts a fresh shell, so a second tap can
   * never save twice or advance twice.
   */
  leaving: boolean;
}

export const INITIAL_SHELL_STATE: ShellState = {
  tries: 1,
  resetKey: 0,
  resultState: 'answering',
  evaluation: null,
  leaving: false,
};

export type ShellActionId = 'submit' | 'retry' | 'next' | 'showAnswer' | 'tryAgain';

export interface ShellAction {
  id: ShellActionId;
  /** Existing keys: the corporate footer keeps today's words. */
  labelKey: string;
  emphasis: 'primary' | 'secondary';
  disabled: boolean;
}

export interface FooterInput {
  mode: QuestionMode;
  resultState: ResultState;
  tries: number;
  /** The body's latest report. */
  ready: boolean;
  /** Today's prop: quiz passes it to hide the Retry pill. */
  hideRetry?: boolean;
  /** ShellState.leaving: after Next, everything is disabled. */
  leaving?: boolean;
}

/** Whether "Try again" is still offered after a wrong answer (practice). */
export function canTryAgain(mode: QuestionMode, tries: number): boolean {
  return mode === 'practice' && tries < MAX_PRACTICE_TRIES;
}

/** The footer buttons for a state, in reading order. */
export function shellFooterActions(input: FooterInput): ShellAction[] {
  const actions = footerActionsFor(input);
  return input.leaving ? actions.map(a => ({ ...a, disabled: true })) : actions;
}

function footerActionsFor(input: FooterInput): ShellAction[] {
  const { mode, resultState, tries, ready, hideRetry = false } = input;
  const next: ShellAction = {
    id: 'next',
    labelKey: 'screen.practice.correctButton',
    emphasis: 'primary',
    disabled: false,
  };
  switch (resultState) {
    case 'answering': {
      const out: ShellAction[] = [
        {
          id: 'submit',
          labelKey: 'screen.practice.submitButton',
          emphasis: 'primary',
          disabled: !ready,
        },
      ];
      if (mode === 'practice' && !hideRetry) {
        out.push({
          id: 'retry',
          labelKey: 'screen.practice.retryButton',
          emphasis: 'secondary',
          disabled: false,
        });
      }
      return out;
    }
    case 'correct':
    case 'revealed':
      return [next];
    case 'incorrect':
      if (mode === 'quiz') return [next];
      return footerActions('incorrect', {
        canShowAnswer: true,
        canRetry: canTryAgain(mode, tries),
      }).map(a => ({ ...a, disabled: false }));
    default:
      return [];
  }
}

/** What the component must do after a press. */
export type ShellEffect =
  /** onSubmit(tries, iscorrect, false, answer, { inlineResult: true }) */
  | {
      kind: 'submit';
      tries: number;
      iscorrect: boolean;
      answer: QuestionEvaluation['answer'];
    }
  /** onSubmit(tries, false, true): after Show answer, move on without a result. */
  | { kind: 'skipRevealed'; tries: number }
  /** onContinue(): what the result popup's button did (next question, or finish). */
  | { kind: 'continue' }
  | { kind: 'none' };

export interface PressContext {
  mode: QuestionMode;
  ready: boolean;
  hideRetry?: boolean;
  /** The body's evaluate(); only called for Submit. */
  evaluate: () => QuestionEvaluation;
  /** False while the question is still inside ARM_MS (see pressArmed). */
  armed?: boolean;
}

/**
 * Applies a footer press. A press on a button that is not offered in the
 * current state (or is disabled) changes nothing, so a double tap cannot
 * submit twice.
 */
export function shellPress(
  state: ShellState,
  id: ShellActionId,
  ctx: PressContext,
): { state: ShellState; effect: ShellEffect } {
  const offered = shellFooterActions({
    mode: ctx.mode,
    resultState: state.resultState,
    tries: state.tries,
    ready: ctx.ready,
    hideRetry: ctx.hideRetry,
    leaving: state.leaving,
  }).find(a => a.id === id && !a.disabled);
  const none = { state, effect: { kind: 'none' } as ShellEffect };
  if (!offered || ctx.armed === false) return none;

  switch (id) {
    case 'submit': {
      const evaluation = ctx.evaluate();
      return {
        state: {
          ...state,
          resultState: evaluation.iscorrect ? 'correct' : 'incorrect',
          evaluation,
        },
        effect: {
          kind: 'submit',
          tries: state.tries,
          iscorrect: evaluation.iscorrect,
          answer: evaluation.answer,
        },
      };
    }
    case 'retry':
    case 'tryAgain':
      return { state: retried(state), effect: { kind: 'none' } };
    case 'showAnswer':
      return { state: revealed(state), effect: { kind: 'none' } };
    case 'next': {
      const leaving = { ...state, leaving: true };
      if (state.resultState === 'revealed')
        return { state: leaving, effect: { kind: 'skipRevealed', tries: state.tries } };
      return { state: leaving, effect: { kind: 'continue' } };
    }
    default:
      return none;
  }
}

/** Clear the answer and count an attempt (Retry, Try again, practiceRef.retry()). */
export function retried(state: ShellState): ShellState {
  return {
    tries: state.tries + 1,
    resetKey: state.resetKey + 1,
    resultState: 'answering',
    evaluation: null,
    leaving: false,
  };
}

/** Show the right answer (Show answer, practiceRef.revealAnswer()). */
export function revealed(state: ShellState): ShellState {
  return { ...state, resultState: 'revealed' };
}

/** The strip's kind for a state, or null when no strip shows. */
export function stripKind(state: ShellState): 'correct' | 'incorrect' | null {
  if (state.resultState === 'correct') return 'correct';
  if (state.resultState === 'incorrect') return 'incorrect';
  return null;
}

/** The screen callback an effect becomes, with its exact arguments. */
export type ShellCall =
  | {
      fn: 'onSubmit';
      args:
        | [number, boolean, boolean, QuestionEvaluation['answer'], { inlineResult: true }]
        | [number, boolean, boolean];
    }
  | { fn: 'onContinue'; args: [] }
  | null;

/**
 * What the component calls for an effect: today's renderer calls, exactly.
 * - submit: onSubmit(tries, iscorrect, false, answer, { inlineResult: true })
 * - skipRevealed: onSubmit(tries, false, true), as PracticeMCQText's submit
 *   does while the answer is shown (no answer: nothing is recorded)
 * - continue: onContinue(), the popup button's action
 */
export function effectCall(effect: ShellEffect): ShellCall {
  switch (effect.kind) {
    case 'submit':
      return {
        fn: 'onSubmit',
        args: [effect.tries, effect.iscorrect, false, effect.answer, { inlineResult: true }],
      };
    case 'skipRevealed':
      return { fn: 'onSubmit', args: [effect.tries, false, true] };
    case 'continue':
      return { fn: 'onContinue', args: [] };
    default:
      return null;
  }
}
