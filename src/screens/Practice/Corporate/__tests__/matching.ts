/**
 * Corporate matching (template 7): the tap state machine (picking, placing,
 * taking back, either tap order), when Submit is enabled, the marks and
 * counts, and how each slot and chip looks. Grading equivalence with the kids
 * renderer and the server is in src/utils/__tests__/answerV1.ts.
 *
 * Plain script run by `tsx` (package.json `test:matching`). Exits non-zero on
 * the first failed check.
 */
import assert from 'node:assert/strict';
import {
  chipState,
  contentKind,
  correctPlacement,
  EMPTY_MATCH,
  evaluateMatching,
  isReady,
  MatchTapState,
  pressChip,
  pressSlot,
  slotState,
} from '../matchingLogic';
import { INITIAL_SHELL_STATE, shellPress } from '../shellLogic';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const A = 'a', B = 'b', C = 'c';
const SLOTS = [A, B, C];
const options = SLOTS.map(id => ({ questionoptionid: id }));
const run = (...steps: Array<(s: MatchTapState) => MatchTapState>) =>
  steps.reduce((s, f) => f(s), EMPTY_MATCH);
const chip = (id: string) => (s: MatchTapState) => pressChip(s, id);
const slot = (id: string) => (s: MatchTapState) => pressSlot(s, id);

check('chip then slot places the chip', () => {
  const s = run(chip(B), slot(A));
  assert.deepEqual(s, { placed: { [A]: B }, pickedChip: null, activeSlot: null });
});

check('slot then chip places the chip', () => {
  const waiting = run(slot(A));
  assert.equal(waiting.activeSlot, A);
  assert.deepEqual(run(slot(A), chip(B)), { placed: { [A]: B }, pickedChip: null, activeSlot: null });
});

check('picking a chip twice puts it down; picking another swaps the pick', () => {
  assert.equal(run(chip(A), chip(A)).pickedChip, null);
  assert.equal(run(chip(A), chip(B)).pickedChip, B);
});

check('an empty slot tapped twice stops waiting; another empty slot moves the wait', () => {
  assert.equal(run(slot(A), slot(A)).activeSlot, null);
  assert.equal(run(slot(A), slot(B)).activeSlot, B);
});

check('tapping a placed chip sends it back to the bank', () => {
  const s = run(chip(B), slot(A), slot(A));
  assert.deepEqual(s, EMPTY_MATCH);
  assert.equal(chipState(B, s), 'default');
});

check('a placed chip is a ghost in the bank and cannot be picked', () => {
  const s = run(chip(B), slot(A));
  assert.equal(chipState(B, s), 'used');
  assert.equal(pressChip(s, B), s);
});

check('placing on a filled slot swaps: the old chip returns to the bank', () => {
  const s = run(chip(B), slot(A), chip(C), slot(A));
  assert.deepEqual(s.placed, { [A]: C });
  assert.equal(chipState(B, s), 'default');
  assert.equal(chipState(C, s), 'used');
});

check('a slot waiting and a chip picked never both hold', () => {
  const s = run(slot(A), chip(B), chip(C));
  assert.equal(s.activeSlot, null);
  const t = run(chip(B), slot(A), slot(C));
  assert.equal(t.pickedChip, null);
  // A chip picked, then an empty slot tapped: places, does not arm the slot.
  assert.equal(run(chip(B), slot(C)).activeSlot, null);
});

check('a chip cannot be in two slots', () => {
  for (const steps of [
    [chip(A), slot(A), chip(A), slot(B)],
    [slot(B), chip(A), slot(A), chip(A)],
  ]) {
    const s = run(...steps);
    const chips = Object.values(s.placed);
    assert.equal(new Set(chips).size, chips.length);
  }
});

check('Submit is enabled only when every slot holds a chip', () => {
  assert.equal(isReady({}, SLOTS), false);
  assert.equal(isReady({ [A]: A, [B]: B }, SLOTS), false);
  assert.equal(isReady({ [A]: A, [B]: B, [C]: C }, SLOTS), true);
  assert.equal(isReady({ [A]: B, [B]: A, [C]: C }, SLOTS), true); // wrong pairs are still an answer
  assert.equal(isReady({ [A]: A, [B]: B, [C]: '' }, SLOTS), false);
  assert.equal(isReady({}, []), false);
  // Taking a chip back turns it off again.
  const full = run(chip(A), slot(A), chip(B), slot(B), chip(C), slot(C));
  assert.equal(isReady(full.placed, SLOTS), true);
  assert.equal(isReady(pressSlot(full, B).placed, SLOTS), false);
});

check('the shell refuses Submit until the body is ready', () => {
  const ev = () => evaluateMatching(options, {});
  const blocked = shellPress(INITIAL_SHELL_STATE, 'submit', { mode: 'practice', ready: false, evaluate: ev });
  assert.equal(blocked.effect.kind, 'none');
  const ok = shellPress(INITIAL_SHELL_STATE, 'submit', { mode: 'practice', ready: true, evaluate: ev });
  assert.equal(ok.effect.kind, 'submit');
});

check('marks: placed slots only, by their own correctness, with counts', () => {
  const ev = evaluateMatching(options, { [A]: A, [B]: C });
  assert.deepEqual(ev.perItem, { [A]: 'correct', [B]: 'incorrect' });
  assert.deepEqual(ev.summary, { correctCount: 1, total: 3 });
  assert.equal(ev.iscorrect, false);
  const all = evaluateMatching(options, { [A]: A, [B]: B, [C]: C });
  assert.equal(all.iscorrect, true);
  assert.deepEqual(all.answer, { v: 1, type: 'match', pairs: { [A]: A, [B]: B, [C]: C } });
  assert.deepEqual(all.summary, { correctCount: 3, total: 3 });
});

check('slot states: empty, target while a chip is picked, active, filled, then the result', () => {
  const none = { marks: null, showAnswer: false };
  assert.equal(slotState(A, EMPTY_MATCH, none), 'empty');
  assert.equal(slotState(A, run(chip(B)), none), 'target');
  assert.equal(slotState(A, run(slot(A)), none), 'active');
  assert.equal(slotState(B, run(slot(A)), none), 'empty');
  assert.equal(slotState(A, run(chip(B), slot(A)), none), 'filled');
  const s = run(chip(A), slot(A), chip(C), slot(B));
  const marks = { [A]: 'correct', [B]: 'incorrect' } as const;
  assert.equal(slotState(A, s, { marks, showAnswer: false }), 'correct');
  assert.equal(slotState(B, s, { marks, showAnswer: false }), 'incorrect');
});

check('Show answer: every slot is correct, with its own chip', () => {
  const placed = correctPlacement(SLOTS);
  assert.deepEqual(placed, { [A]: A, [B]: B, [C]: C });
  for (const id of SLOTS) {
    assert.equal(slotState(id, { ...EMPTY_MATCH, placed }, { marks: null, showAnswer: true }), 'correct');
  }
});

check('content kinds: text, picture (type 6), sound (any other file)', () => {
  assert.deepEqual(contentKind({ text: 'cat' }), { kind: 'text', hasFile: false, hasText: true });
  assert.deepEqual(contentKind({ text: ' ', file: { filename: 'x.jpg', filetype: 6 } }), {
    kind: 'image', hasFile: true, hasText: false,
  });
  assert.equal(contentKind({ text: '', file: { filename: 'x.wav', filetype: 1 } }).kind, 'audio');
  assert.equal(contentKind({ text: 'hat', file: { filename: '', filetype: 1 } }).kind, 'text');
  assert.equal(contentKind({}).hasText, false);
});

console.log(`matching: ${passed} checks passed`);
