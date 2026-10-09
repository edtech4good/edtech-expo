/**
 * useQuizIntroGate, rendered with react-test-renderer: the intro starts
 * showing (corporate), Start waits while loading, Start after a load runs
 * onBegin once and reveals the quiz, loading finishing never auto-starts, a
 * later reload never brings the intro back, an empty load makes Start a
 * retry, and kids are never shown the intro.
 *
 * Plain script run by `tsx` (package.json `test:quizintro`).
 */
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import useQuizIntroGate from '../useQuizIntroGate';

type Gate = ReturnType<typeof useQuizIntroGate>;
function setup(opts: { isCorporate?: boolean; questionCount?: number } = {}) {
  const state = {
    gate: null as unknown as Gate,
    begins: 0,
    fetches: 0,
    resolve: [] as Array<() => void>,
    reject: [] as Array<(e: Error) => void>,
    count: opts.questionCount ?? 0,
  };
  const fetch = () => {
    state.fetches++;
    return new Promise<void>((res, rej) => {
      state.resolve.push(res);
      state.reject.push(rej);
    });
  };
  function Probe() {
    state.gate = useQuizIntroGate({
      isCorporate: opts.isCorporate ?? true,
      fetch,
      questionCount: state.count,
      onBegin: () => {
        state.begins++;
      },
    });
    return null;
  }
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(Probe));
  });
  const rerender = () => act(() => r.update(React.createElement(Probe)));
  /** Settle the oldest pending fetch, then set how many questions it loaded. */
  const settle = async (questions: number, fail = false) => {
    await act(async () => {
      state.count = questions;
      const i = state.resolve.length - 1;
      fail ? state.reject[i](new Error('offline')) : state.resolve[i]();
      await Promise.resolve();
    });
  };
  const load = () => act(async () => { void state.gate.load(); });
  return { state, rerender, settle, load };
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

async function main() {
  await check('corporate: shows the intro, busy until the first load settles', async () => {
    const t = setup();
    assert.equal(t.state.gate.visible, true);
    assert.equal(t.state.gate.started, false);
    assert.equal(t.state.gate.loading, true);
  });

  await check('Start while loading does nothing', async () => {
    const t = setup({ questionCount: 8 });
    await t.load();
    act(() => t.state.gate.start());
    assert.equal(t.state.begins, 0);
    assert.equal(t.state.gate.visible, true);
  });

  await check('loading finishing does NOT start the quiz', async () => {
    const t = setup();
    await t.load();
    await t.settle(8);
    assert.equal(t.state.gate.loading, false);
    assert.equal(t.state.gate.visible, true, 'still on the intro');
    assert.equal(t.state.begins, 0);
  });

  await check('Start after a load begins once and reveals the quiz', async () => {
    const t = setup();
    await t.load();
    await t.settle(8);
    act(() => t.state.gate.start());
    assert.equal(t.state.begins, 1, 'onBegin (quiz clock reset) ran once');
    assert.equal(t.state.gate.visible, false);
    assert.equal(t.state.gate.started, true);
  });

  await check('a later reload does NOT bring the intro back (or restart the clock)', async () => {
    const t = setup();
    await t.load();
    await t.settle(8);
    act(() => t.state.gate.start());
    await t.load();
    assert.equal(t.state.gate.visible, false, 'reload in flight');
    await t.settle(8);
    assert.equal(t.state.gate.visible, false, 'reload settled');
    await t.load();
    await t.settle(0, true);
    assert.equal(t.state.gate.visible, false, 'failed reload');
    assert.equal(t.state.begins, 1);
  });

  await check('a load that fails or returns nothing makes Start a retry', async () => {
    const t = setup();
    await t.load();
    await t.settle(0, true); // rejected: swallowed, not thrown
    assert.equal(t.state.gate.loading, false);
    const before = t.state.fetches;
    act(() => t.state.gate.start());
    assert.equal(t.state.fetches, before + 1, 'tap reloads');
    assert.equal(t.state.begins, 0);
    assert.equal(t.state.gate.visible, true);
    await t.settle(8);
    act(() => t.state.gate.start());
    assert.equal(t.state.begins, 1);
  });

  await check('kids: no intro, ever', async () => {
    const t = setup({ isCorporate: false });
    assert.equal(t.state.gate.visible, false);
    await t.load();
    await t.settle(8);
    assert.equal(t.state.gate.visible, false);
    assert.equal(t.state.begins, 0, 'no clock reset is needed or run');
  });
  console.log(`${passed} checks passed`);
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});
