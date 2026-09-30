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
  canTryAgain,
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
  assert.deepEqual(again.state, { tries: 2, resetKey: 1, resultState: 'answering', evaluation: null });
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
  assert.deepEqual(r.state, { tries: 2, resetKey: 1, resultState: 'answering', evaluation: null });
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

console.log(`shellLogic: ${passed} checks passed`);
