/**
 * Whether the quiz screen shows the intro card instead of question 1.
 *
 * Corporate quizzes only, and only until the learner taps Start. Kids-theme
 * quizzes and every practice go straight to question 1, as before.
 */
export function showQuizIntro(isCorporate: boolean, started: boolean): boolean {
  return isCorporate && !started;
}

/** Phones turned sideways are too short for the stacked layout (as on the result screen). */
export const INTRO_COMPACT_HEIGHT = 500;
/** On wide screens the Start pill stops at this width, centred (as the result screen's Finish). */
export const INTRO_START_MAX_WIDTH = 360;

export type IntroStartAction = 'wait' | 'retry' | 'start';

/**
 * What tapping Start does. While the questions are loading the button is busy
 * and does nothing; if loading finished with no questions (offline, server
 * error) a tap loads them again; otherwise it starts the quiz.
 */
export function introStartAction(loading: boolean, questionCount: number): IntroStartAction {
  if (loading) return 'wait';
  return questionCount > 0 ? 'start' : 'retry';
}
