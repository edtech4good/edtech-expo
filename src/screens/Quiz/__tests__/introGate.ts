/**
 * The corporate quiz intro gate, and what QuizScreen does with it.
 *
 *  - the intro shows for corporate until Start, never for kids;
 *  - Start does nothing while loading, retries when the load came back empty,
 *    and starts the quiz otherwise;
 *
 * The stateful behaviour is tested in useQuizIntroGateRender.tsx; QuizScreen
 * itself (redux, expo-router, forms) is exercised in a real browser, see the
 * PR body. Plain script run by `tsx` (package.json `test:quizintro`).
 */
import assert from 'node:assert/strict';
import { introStartAction, showQuizIntro } from '../introGate';

// Gate: corporate only, until Start.
assert.equal(showQuizIntro(true, false), true, 'corporate shows the intro first');
assert.equal(showQuizIntro(true, true), false, 'Start reveals question 1');
assert.equal(showQuizIntro(false, false), false, 'kids go straight to question 1');
assert.equal(showQuizIntro(false, true), false);
console.log('ok  intro shows for corporate until Start, never for kids');

// Start action.
assert.equal(introStartAction(true, 0), 'wait', 'loading: busy, does nothing');
assert.equal(introStartAction(true, 8), 'wait', 'still waits while a reload is in flight');
assert.equal(introStartAction(false, 0), 'retry', 'loaded nothing: tap retries');
assert.equal(introStartAction(false, 8), 'start');
console.log('ok  start action');

