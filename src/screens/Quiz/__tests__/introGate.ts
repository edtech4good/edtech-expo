/**
 * The corporate quiz intro gate, and what QuizScreen does with it.
 *
 *  - the intro shows for corporate until Start, never for kids;
 *  - Start does nothing while loading, retries when the load came back empty,
 *    and starts the quiz otherwise;
 *  - QuizScreen renders the intro (not question 1) while it is showing,
 *    resets the quiz start time at Start, sends nothing from the intro, and
 *    leaves the kids branch alone (source checks: QuizScreen needs redux,
 *    expo-router and forms, so it is exercised in a real browser as well, see
 *    the PR body).
 *
 * Plain script run by `tsx` (package.json `test:quizintro`).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

const src = fs.readFileSync(path.resolve(__dirname, '../QuizScreen.tsx'), 'utf8');

// The intro is rendered by the gate, before any question content.
const introAt = src.search(/if \(introVisible\)\s*\{\s*return \(\s*<QuizIntro/);
assert.ok(introAt > 0, 'QuizScreen must return <QuizIntro> while introVisible');
assert.ok(
  introAt < src.indexOf('<PracticeContent'),
  'the intro must be returned before the question content is rendered',
);
assert.match(src, /const introVisible = showQuizIntro\(isCorporate, started\)/);
assert.match(src, /const \[started, setStarted\] = useState\(false\)/);

// Start: the quiz clock restarts, then question 1 shows. Nothing else.
const handleStart = /const handleStart = \(\) => \{([\s\S]*?)\n  \};/.exec(src);
assert.ok(handleStart, 'handleStart exists');
const body = handleStart![1];
assert.match(body, /methods\.setValue\('starttime', createTimeStamp\(\)\)/, 'Start resets starttime');
assert.match(body, /setStarted\(true\)/);
for (const forbidden of ['saveResult', 'submitResult', 'dispatch(', 'calculateResult', 'router.'])
  assert.ok(!body.includes(forbidden), `handleStart must not call ${forbidden}`);
assert.ok(
  body.indexOf("setValue('starttime'") < body.indexOf('setStarted(true)'),
  'starttime is reset before question 1 shows',
);
// The submitted payload still carries the form's starttime.
assert.match(src, /starttime: methods\.getValues\('starttime'\)/);

// The intro has nothing to lose: back leaves directly (the exit prompt is
// not mounted behind the intro).
assert.match(src, /if \(introVisible\) \{\s*handleGoBack\(\);\s*return;\s*\}/, 'back from the intro leaves without the exit prompt');

// Kids unchanged: the intro component is never reachable without isCorporate.
assert.ok(!/isCorporate\s*\?\s*<QuizIntro/.test(src));
assert.ok(!/QuizIntro/.test(fs.readFileSync(path.resolve(__dirname, '../../Practice/PracticeScreen.tsx'), 'utf8')), 'practice has no intro');
console.log('ok  QuizScreen wiring');
