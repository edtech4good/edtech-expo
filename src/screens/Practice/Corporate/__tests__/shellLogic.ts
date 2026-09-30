/**
 * The corporate question shell's rules (shellLogic.ts) and the registry's
 * choice (templateRegistry.ts): which renderer a question gets, when Submit
 * is enabled, which footer buttons show in practice and quiz, and what each
 * press sends to the screen (today's onSubmit / popup-button calls).
 *
 * Plain script run by `tsx` (package.json `test:shell`). Exits non-zero on
 * the first failed check.
 */
import assert from 'node:assert/strict';
import {
  ARM_MS,
  canTryAgain,
  effectCall,
  pressArmed,
  INITIAL_SHELL_STATE,
  PressContext,
  shellFooterActions,
  shellPress,
  ShellState,
  stripKind,
} from '../shellLogic';
import { chooseModule, CORPORATE_MODULE_BY_TEMPLATE } from '../templateRegistry';
import { TemplateTypeId } from '../../../../constants/QuestionTemplate';
import type { QuestionEvaluation } from '../types';
import {
  COMPACT_BELOW,
  COMPACT_SPACING,
  computeBodyLayout,
  REGULAR_SPACING,
  ShellMeasures,
  SHELL_COLUMN_WIDTH,
} from '../shellLayout';
import { COMPACT_OPTION_MIN_WIDTH, compactColumns } from '../mcqTextLogic';
import {
  selectionModeFor,
  selectionRoles,
  selectOption,
} from '../selectionMode';

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

const RIGHT: QuestionEvaluation = {
  iscorrect: true,
  answer: { v: 1, type: 'choice', selected: ['a'] },
  perItem: { a: 'correct' },
};
const WRONG: QuestionEvaluation = {
  iscorrect: false,
  answer: { v: 1, type: 'choice', selected: ['b'] },
  perItem: { b: 'incorrect' },
};

const ctx = (over: Partial<PressContext> = {}): PressContext => ({
  mode: 'practice',
  ready: true,
  evaluate: () => RIGHT,
  ...over,
});
const ids = (s: ShellState, c: PressContext) =>
  shellFooterActions({
    mode: c.mode,
    resultState: s.resultState,
    tries: s.tries,
    ready: c.ready,
    hideRetry: c.hideRetry,
    leaving: s.leaving,
  }).map(a => `${a.id}${a.disabled ? '(disabled)' : ''}`);

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
check('registry: corporate schools get the corporate module for templates 1-8', () => {
  const expected: Record<number, string> = {
    [TemplateTypeId.MCQSingleText]: 'MCQText',
    [TemplateTypeId.MCQMultiText]: 'MCQText',
    [TemplateTypeId.MCQSingleImage]: 'MCQImage',
    [TemplateTypeId.MCQMultiImage]: 'MCQImage',
    [TemplateTypeId.TextOrdering]: 'TextOrdering',
    [TemplateTypeId.ImageOrdering]: 'ImageOrdering',
    [TemplateTypeId.DragDrop]: 'Matching',
    [TemplateTypeId.FillInBlank]: 'FillBlank',
  };
  for (const [id, name] of Object.entries(expected)) {
    assert.deepEqual(chooseModule(Number(id), true), { theme: 'corporate', name });
  }
  assert.equal(Object.keys(CORPORATE_MODULE_BY_TEMPLATE).length, 8);
});

check("registry: kids-theme schools always get today's renderer", () => {
  for (const id of Object.values(TemplateTypeId)) {
    assert.deepEqual(chooseModule(id, false), { theme: 'kids', templateId: id });
  }
});

check("registry: templates outside 1-8 keep today's renderer for corporate too", () => {
  for (const id of [
    TemplateTypeId.Fraction,
    TemplateTypeId.DOption1,
    TemplateTypeId.FOption4,
    999,
  ]) {
    assert.deepEqual(chooseModule(id, true), { theme: 'kids', templateId: id });
  }
});

// ---------------------------------------------------------------------------
// Submit gating
// ---------------------------------------------------------------------------
check('submit is disabled until the body reports ready, and a press does nothing', () => {
  let evaluated = 0;
  const c = ctx({ ready: false, evaluate: () => (evaluated++, RIGHT) });
  assert.deepEqual(ids(INITIAL_SHELL_STATE, c), ['submit(disabled)', 'retry']);
  const r = shellPress(INITIAL_SHELL_STATE, 'submit', c);
  assert.equal(r.state, INITIAL_SHELL_STATE);
  assert.deepEqual(r.effect, { kind: 'none' });
  assert.equal(evaluated, 0, 'evaluate is not called while not ready');
  assert.deepEqual(ids(INITIAL_SHELL_STATE, ctx()), ['submit', 'retry']);
});

check('submit sends onSubmit(tries, iscorrect, false, answer) once; a second press does nothing', () => {
  const first = shellPress(INITIAL_SHELL_STATE, 'submit', ctx({ evaluate: () => WRONG }));
  assert.deepEqual(first.effect, { kind: 'submit', tries: 1, iscorrect: false, answer: WRONG.answer });
  assert.equal(first.state.resultState, 'incorrect');
  assert.deepEqual(first.state.evaluation, WRONG);
  const again = shellPress(first.state, 'submit', ctx());
  assert.deepEqual(again.effect, { kind: 'none' });
});

// ---------------------------------------------------------------------------
// Footer per mode and result
// ---------------------------------------------------------------------------
check('practice, correct: Next, which continues (the popup button: next question or finish)', () => {
  const { state } = shellPress(INITIAL_SHELL_STATE, 'submit', ctx());
  assert.equal(stripKind(state), 'correct');
  assert.deepEqual(ids(state, ctx()), ['next']);
  assert.deepEqual(shellPress(state, 'next', ctx()).effect, { kind: 'continue' });
});

check('practice, incorrect: Show answer and Try again; Try again clears and counts a try', () => {
  const c = ctx({ evaluate: () => WRONG });
  const { state } = shellPress(INITIAL_SHELL_STATE, 'submit', c);
  assert.equal(stripKind(state), 'incorrect');
  assert.deepEqual(ids(state, c), ['showAnswer', 'tryAgain']);
  const again = shellPress(state, 'tryAgain', c);
  assert.deepEqual(again.effect, { kind: 'none' });
  assert.deepEqual(again.state, { tries: 2, resetKey: 1, resultState: 'answering', evaluation: null, leaving: false });
});

check('practice: the third wrong answer offers only Show answer (today forces it once tries > 2)', () => {
  const c = ctx({ evaluate: () => WRONG });
  let s = INITIAL_SHELL_STATE;
  const seen: number[] = [];
  for (;;) {
    const sub = shellPress(s, 'submit', c);
    assert.equal(sub.effect.kind, 'submit');
    if (sub.effect.kind === 'submit') seen.push(sub.effect.tries);
    s = sub.state;
    if (!canTryAgain('practice', s.tries)) break;
    s = shellPress(s, 'tryAgain', c).state;
  }
  assert.deepEqual(seen, [1, 2, 3], 'tries sent: 1, 2, 3');
  assert.deepEqual(ids(s, c), ['showAnswer']);
  assert.deepEqual(shellPress(s, 'tryAgain', c).effect, { kind: 'none' });
});

check('practice: Show answer reveals, then Next sends onSubmit(tries, false, true) with no answer', () => {
  const c = ctx({ evaluate: () => WRONG });
  const submitted = shellPress(INITIAL_SHELL_STATE, 'submit', c).state;
  const shown = shellPress(submitted, 'showAnswer', c);
  assert.equal(shown.state.resultState, 'revealed');
  assert.equal(stripKind(shown.state), null);
  assert.deepEqual(ids(shown.state, c), ['next']);
  assert.deepEqual(shellPress(shown.state, 'next', c).effect, { kind: 'skipRevealed', tries: 1 });
});

check('practice: Retry before submitting clears the answer and counts a try (as the footer does today)', () => {
  const r = shellPress(INITIAL_SHELL_STATE, 'retry', ctx());
  assert.deepEqual(r.state, { tries: 2, resetKey: 1, resultState: 'answering', evaluation: null, leaving: false });
  const sub = shellPress(r.state, 'submit', ctx());
  assert.deepEqual(sub.effect, { kind: 'submit', tries: 2, iscorrect: true, answer: RIGHT.answer });
});

check('quiz: Submit only, then Next after a right or a wrong answer; no retry anywhere', () => {
  const q = ctx({ mode: 'quiz', hideRetry: true });
  assert.deepEqual(ids(INITIAL_SHELL_STATE, q), ['submit']);
  assert.deepEqual(ids(INITIAL_SHELL_STATE, { ...q, hideRetry: false }), ['submit']);
  for (const ev of [RIGHT, WRONG]) {
    const c = { ...q, evaluate: () => ev };
    const sub = shellPress(INITIAL_SHELL_STATE, 'submit', c);
    assert.deepEqual(sub.effect, { kind: 'submit', tries: 1, iscorrect: ev.iscorrect, answer: ev.answer });
    assert.deepEqual(ids(sub.state, c), ['next']);
    assert.deepEqual(shellPress(sub.state, 'next', c).effect, { kind: 'continue' });
    for (const id of ['tryAgain', 'showAnswer', 'retry'] as const) {
      assert.deepEqual(shellPress(sub.state, id, c).effect, { kind: 'none' });
      assert.equal(shellPress(sub.state, id, c).state, sub.state);
    }
  }
  assert.equal(shellPress(INITIAL_SHELL_STATE, 'retry', q).state, INITIAL_SHELL_STATE);
});

check('practice with hideRetry: no Retry pill before submitting', () => {
  assert.deepEqual(ids(INITIAL_SHELL_STATE, ctx({ hideRetry: true })), ['submit']);
});


// ---------------------------------------------------------------------------
// Double taps: one Next moves on once; one Submit submits once.
// ---------------------------------------------------------------------------
const ALL = ['submit', 'retry', 'next', 'showAnswer', 'tryAgain'] as const;

check('a second Next (or any press) after Next does nothing, and every button is disabled', () => {
  const cases: Array<[string, PressContext, QuestionEvaluation, boolean]> = [
    ['practice correct', ctx(), RIGHT, false],
    ['practice revealed', ctx({ evaluate: () => WRONG }), WRONG, true],
    ['quiz correct', ctx({ mode: 'quiz', hideRetry: true }), RIGHT, false],
    ['quiz wrong', ctx({ mode: 'quiz', hideRetry: true, evaluate: () => WRONG }), WRONG, false],
  ];
  for (const [name, c0, ev, reveal] of cases) {
    const c = { ...c0, evaluate: () => ev };
    let s = shellPress(INITIAL_SHELL_STATE, 'submit', c).state;
    if (reveal) s = shellPress(s, 'showAnswer', c).state;
    const first = shellPress(s, 'next', c);
    assert.notEqual(first.effect.kind, 'none', name);
    assert.equal(first.state.leaving, true, name);
    assert.ok(ids(first.state, c).every(x => x.endsWith('(disabled)')), `${name}: ${ids(first.state, c)}`);
    for (const id of ALL) {
      const again = shellPress(first.state, id, c);
      assert.deepEqual(again.effect, { kind: 'none' }, `${name}: ${id} after Next`);
      assert.equal(again.state, first.state);
    }
  }
});

check('a second Submit on the state the first one produced does nothing', () => {
  for (const ev of [RIGHT, WRONG]) {
    for (const c of [ctx({ evaluate: () => ev }), ctx({ mode: 'quiz', hideRetry: true, evaluate: () => ev })]) {
      let calls = 0;
      const counted = { ...c, evaluate: () => (calls++, ev) };
      const first = shellPress(INITIAL_SHELL_STATE, 'submit', counted);
      const second = shellPress(first.state, 'submit', counted);
      assert.deepEqual(second.effect, { kind: 'none' });
      assert.equal(calls, 1, 'evaluate runs once');
    }
  }
});

check('a freshly shown question ignores presses for ARM_MS', () => {
  assert.equal(pressArmed(1000, 1000), false);
  assert.equal(pressArmed(1000, 1000 + ARM_MS - 1), false);
  assert.equal(pressArmed(1000, 1000 + ARM_MS), true);
  let calls = 0;
  const c = ctx({ armed: false, evaluate: () => (calls++, RIGHT) });
  for (const id of ALL) {
    const r = shellPress(INITIAL_SHELL_STATE, id, c);
    assert.deepEqual(r.effect, { kind: 'none' });
    assert.equal(r.state, INITIAL_SHELL_STATE);
  }
  assert.equal(calls, 0);
  assert.equal(shellPress(INITIAL_SHELL_STATE, 'submit', ctx({ armed: true })).effect.kind, 'submit');
});

// ---------------------------------------------------------------------------
// Effect -> the screen call, with its exact arguments.
// ---------------------------------------------------------------------------
check('effects become exactly today\'s screen calls', () => {
  assert.deepEqual(
    effectCall({ kind: 'submit', tries: 2, iscorrect: false, answer: WRONG.answer }),
    { fn: 'onSubmit', args: [2, false, false, WRONG.answer, { inlineResult: true }] },
  );
  assert.deepEqual(
    effectCall({ kind: 'submit', tries: 1, iscorrect: true, answer: RIGHT.answer }),
    { fn: 'onSubmit', args: [1, true, false, RIGHT.answer, { inlineResult: true }] },
  );
  assert.deepEqual(
    effectCall({ kind: 'submit', tries: 1, iscorrect: false, answer: null }),
    { fn: 'onSubmit', args: [1, false, false, null, { inlineResult: true }] },
  );
  const skip = effectCall({ kind: 'skipRevealed', tries: 3 });
  assert.deepEqual(skip, { fn: 'onSubmit', args: [3, false, true] });
  assert.equal(skip?.args.length, 3, 'no answer and no options after Show answer');
  assert.deepEqual(effectCall({ kind: 'continue' }), { fn: 'onContinue', args: [] });
  assert.equal(effectCall({ kind: 'none' }), null);
});

check('end to end: press sequences produce exactly the calls today\'s renderer made', () => {
  const run = (c: PressContext, presses: Array<typeof ALL[number]>) => {
    let s = INITIAL_SHELL_STATE;
    const calls: unknown[] = [];
    for (const id of presses) {
      const r = shellPress(s, id, c);
      s = r.state;
      const call = effectCall(r.effect);
      if (call) calls.push(call);
    }
    return calls;
  };
  const wrong = ctx({ evaluate: () => WRONG });
  assert.deepEqual(run(wrong, ['submit', 'showAnswer', 'next', 'next']), [
    { fn: 'onSubmit', args: [1, false, false, WRONG.answer, { inlineResult: true }] },
    { fn: 'onSubmit', args: [1, false, true] },
  ]);
  assert.deepEqual(run(ctx(), ['retry', 'submit', 'submit', 'next', 'next']), [
    { fn: 'onSubmit', args: [2, true, false, RIGHT.answer, { inlineResult: true }] },
    { fn: 'onContinue', args: [] },
  ]);
  assert.deepEqual(run(ctx({ mode: 'quiz', hideRetry: true, evaluate: () => WRONG }), ['submit', 'next', 'next', 'submit']), [
    { fn: 'onSubmit', args: [1, false, false, WRONG.answer, { inlineResult: true }] },
    { fn: 'onContinue', args: [] },
  ]);
});

// ---------------------------------------------------------------------------
// The body's layout (shellLayout.ts): measured viewport minus the card.
// ---------------------------------------------------------------------------

const measures = (over: Partial<ShellMeasures> = {}): ShellMeasures => ({
  viewport: { width: 390, height: 560 },
  cardHeight: 150,
  regularCardHeight: 150,
  stripHeight: 0,
  gutter: 20,
  ...over,
});

check('layout: null until both the viewport and the card are measured (first frame)', () => {
  assert.equal(computeBodyLayout(measures({ viewport: null })), null);
  assert.equal(computeBodyLayout(measures({ cardHeight: null })), null);
  assert.notEqual(computeBodyLayout(measures()), null);
});

check('layout: available height is the viewport minus the card, the padding and the gap', () => {
  const l = computeBodyLayout(measures())!;
  assert.equal(l.availableHeight, 560 - REGULAR_SPACING.scrollPadding * 2 - 150 - REGULAR_SPACING.cardGap);
  assert.equal(l.availableHeight, 362);
  assert.equal(l.compact, false);
  // A taller card (a two-line heading) leaves less.
  assert.equal(computeBodyLayout(measures({ cardHeight: 190, regularCardHeight: 190 }))!.availableHeight, 322);
});

check('layout: available width is the column (760 cap) minus the gutters', () => {
  assert.equal(computeBodyLayout(measures())!.availableWidth, 390 - 40);
  assert.equal(computeBodyLayout(measures({ viewport: { width: 1280, height: 700 } }))!.availableWidth, SHELL_COLUMN_WIDTH);
  assert.equal(computeBodyLayout(measures({ viewport: { width: 790, height: 700 } }))!.availableWidth, 750);
});

check('layout: the result strip shrinking the viewport shrinks the body by the same amount, and compact holds', () => {
  const before = computeBodyLayout(measures())!;
  // The footer grew by the strip (80) plus its gap: the ScrollView is 90 shorter.
  const after = computeBodyLayout(measures({ viewport: { width: 390, height: 470 }, stripHeight: 90 }))!;
  assert.equal(before.availableHeight - after.availableHeight, 90);
  assert.equal(after.compact, before.compact);
  // Near the threshold the strip alone must not switch to compact.
  const edge = 150 + REGULAR_SPACING.scrollPadding * 2 + REGULAR_SPACING.cardGap + COMPACT_BELOW;
  const edgeBefore = computeBodyLayout(measures({ viewport: { width: 390, height: edge } }))!;
  const edgeAfter = computeBodyLayout(measures({ viewport: { width: 390, height: edge - 90 }, stripHeight: 90 }))!;
  assert.equal(edgeBefore.compact, false);
  assert.equal(edgeAfter.compact, false);
  assert.equal(edgeAfter.availableHeight, COMPACT_BELOW - 90);
});

check(`layout: compact below ${COMPACT_BELOW} for the body with the regular card, never flapping`, () => {
  const edge = 150 + REGULAR_SPACING.scrollPadding * 2 + REGULAR_SPACING.cardGap + COMPACT_BELOW;
  assert.equal(computeBodyLayout(measures({ viewport: { width: 390, height: edge } }))!.compact, false);
  assert.equal(computeBodyLayout(measures({ viewport: { width: 390, height: edge - 1 } }))!.compact, true);
  // A phone on its side.
  const side = computeBodyLayout(measures({ viewport: { width: 812, height: 230 } }))!;
  assert.equal(side.compact, true);
  // Once compact, the card is drawn smaller (cardHeight 70), which leaves
  // more room; compact is still decided on the regular card, so it holds.
  const drawnCompact = computeBodyLayout(measures({ viewport: { width: 812, height: edge - 1 }, cardHeight: 70 }))!;
  assert.equal(drawnCompact.compact, true);
  assert.equal(drawnCompact.availableHeight, edge - 1 - COMPACT_SPACING.scrollPadding * 2 - 70 - COMPACT_SPACING.cardGap);
});

check('compact multiple choice: as many columns as fit the measured width, audio circles included', () => {
  // 812 x 375 on the web: 684 wide. Three options with audio fit on one row.
  assert.equal(compactColumns(3, 684, 10, 52), 3);
  // Four without audio fit on one row; with audio, three.
  assert.equal(compactColumns(4, 684, 10, 0), 4);
  assert.equal(compactColumns(4, 684, 10, 52), 3);
  // Never more columns than options, never fewer than one.
  assert.equal(compactColumns(2, 684, 10, 0), 2);
  assert.equal(compactColumns(4, 100, 10, 0), 1);
  // The edge: exactly n minimum-width cells and their gaps.
  assert.equal(compactColumns(5, COMPACT_OPTION_MIN_WIDTH * 3 + 20, 10, 0), 3);
  assert.equal(compactColumns(5, COMPACT_OPTION_MIN_WIDTH * 3 + 19, 10, 0), 2);
});

// ---------------------------------------------------------------------------
// Single or multiple selection (selectionMode.ts).
// ---------------------------------------------------------------------------

const q = (...correct: boolean[]) => ({
  questionobject: { questionoptions: correct.map(c => ({ questionoptioniscorrect: c })) },
});

check('selection: templates 1 and 2 are single-select; 3 and 4 (and others) stay multi', () => {
  assert.equal(selectionModeFor(TemplateTypeId.MCQSingleText, q(true, false, false)), 'single');
  assert.equal(selectionModeFor(TemplateTypeId.MCQSingleImage, q(false, true)), 'single');
  assert.equal(selectionModeFor(TemplateTypeId.MCQMultiText, q(true, false)), 'multi');
  assert.equal(selectionModeFor(TemplateTypeId.MCQMultiImage, q(true, true)), 'multi');
  assert.equal(selectionModeFor(TemplateTypeId.TextOrdering, q(true)), 'multi');
});

check('selection: a template 1 or 2 question with several correct options keeps multi (bad data stays answerable)', () => {
  assert.equal(selectionModeFor(TemplateTypeId.MCQSingleText, q(true, true, false)), 'multi');
  assert.equal(selectionModeFor(TemplateTypeId.MCQSingleImage, q(true, false, true)), 'multi');
  // No options, or none correct, is still single (nothing to lose).
  assert.equal(selectionModeFor(TemplateTypeId.MCQSingleText, q()), 'single');
  assert.equal(selectionModeFor(TemplateTypeId.MCQSingleText, null), 'single');
});

check('selection: single replaces on tap; tapping the chosen option keeps it', () => {
  let s: Record<string, string> = {};
  s = selectOption(s, 'a', 'A', 'single');
  assert.deepEqual(s, { a: 'A' });
  s = selectOption(s, 'b', 'B', 'single');
  assert.deepEqual(s, { b: 'B' });
  s = selectOption(s, 'b', 'B', 'single');
  assert.deepEqual(s, { b: 'B' });
  s = selectOption(s, 'c', 'C', 'single');
  assert.deepEqual(Object.keys(s), ['c']);
});

check('selection: multi toggles, keeping selection order (today\'s rule)', () => {
  let s: Record<string, string> = {};
  s = selectOption(s, 'a', 'A', 'multi');
  s = selectOption(s, 'b', 'B', 'multi');
  assert.deepEqual(Object.keys(s), ['a', 'b']);
  s = selectOption(s, 'a', 'A', 'multi');
  assert.deepEqual(s, { b: 'B' });
});

check('selection: single is radios in a radiogroup; multi is checkboxes in a group', () => {
  assert.deepEqual(selectionRoles('single'), { group: 'radiogroup', option: 'radio' });
  assert.deepEqual(selectionRoles('multi'), { group: 'group', option: 'checkbox' });
});

console.log(`shellLogic: ${passed} checks passed`);
