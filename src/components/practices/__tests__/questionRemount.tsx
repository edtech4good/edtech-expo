/**
 * PracticeContent rendered (react-test-renderer over react-native-web, see
 * nativeStubs.ts) with a stub question module that counts its mounts: a new
 * question index gives a fresh renderer, and a re-render at the same index
 * (a retry, the result popup, new callbacks) does not.
 *
 * Plain script run by `tsx` (package.json `test:questionkey`). Exits
 * non-zero on the first failed check.
 */
import './nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React, { forwardRef, useEffect } from 'react';

const h = React.createElement;
let mounts = 0;
let unmounts = 0;
const StubModule = forwardRef<unknown, { question: { id: string } }>(function Stub(_p, _ref) {
  useEffect(() => {
    mounts += 1;
    return () => {
      unmounts += 1;
    };
  }, []);
  return h('span');
});

const extra: Record<string, unknown> = {
  '@/screens/Practice/Corporate/registry': { __esModule: true, resolveQuestionModule: () => StubModule },
  '@/services': { __esModule: true, useDesign: () => ({ isCorporate: false }) },
  '@/models': { __esModule: true },
  '@/screens/Practice/PracticeScreen': { __esModule: true },
  '../layouts/SizedBox': { __esModule: true, default: { Large: () => h('span') } },
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request in extra) return extra[request];
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act } from 'react-test-renderer';
// Required after the redirects above (imports are hoisted above them).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const P = require('../PracticeContent').default as any;
const q = (id: string) => ({ id, templatetypeid: 7, questionobject: {} });
const render = (r: any, question: any, index: number, onSubmit: () => void = () => undefined) =>
  act(() => {
    r.update(h(P, { question, currentQuestionIndex: index, maxQuestion: 3, onSubmit }));
  });

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

let r: any;
act(() => {
  r = TestRenderer.create(h(P, { question: q('a'), currentQuestionIndex: 1, maxQuestion: 3 }));
});

check('the first question mounts the renderer once', () => {
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);
});

check('a re-render at the same index with new props does not remount', () => {
  // Same question object, new callback (a screen re-render).
  render(r, q('a'), 1, () => undefined);
  assert.equal(mounts, 1, 'no remount');
  assert.equal(unmounts, 0);
});

check('the next question index remounts the renderer', () => {
  render(r, q('b'), 2);
  assert.equal(mounts, 2, 'fresh renderer for question 2');
  assert.equal(unmounts, 1, 'question 1 renderer unmounted');
});

check('the same question object at a new index still remounts (the API sends no id)', () => {
  // Only the index differs.
  render(r, q('b'), 3);
  assert.equal(mounts, 3);
  assert.equal(unmounts, 2);
});

check('staying on the question stays stable', () => {
  render(r, q('b'), 3);
  assert.equal(mounts, 3);
});

console.log(`questionRemount: ${passed} checks passed`);
