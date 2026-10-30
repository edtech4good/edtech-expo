/**
 * Orientation policy and the lesson video's full-screen exception
 * (edtech-expo#143).
 *
 * Part 1: the pure policy (phone + full screen -> landscape allowed; phone
 * after exit -> portrait; tablet unchanged).
 * Part 2: the real useOrientationPolicy hook rendered with react-test-renderer
 * over a fake expo-screen-orientation, driven the way the app drives it:
 * the lesson screen flips the flag, the hook must re-lock, and the
 * orientation-change listener must stop (or resume) fighting a rotation.
 *
 * Plain script run by `tsx` (package.json `test:orientation`). Exits non-zero
 * on the first failure.
 */
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

import {
  contradictsPolicy,
  orientationPolicyFor,
} from '../orientationPolicy';

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  const done = () => {
    passed += 1;
    console.log(`ok  ${name}`);
  };
  const failed = (e: unknown) => {
    console.error(`FAIL ${name}`);
    throw e;
  };
  try {
    const r = fn();
    if (r && typeof (r as Promise<void>).then === 'function')
      return (r as Promise<void>).then(done, failed);
    done();
  } catch (e) {
    failed(e);
  }
  return Promise.resolve();
}

// ---------------------------------------------------------------- part 1
const policyChecks = () => {
  check('phone, no full screen: portrait', () => {
    assert.equal(orientationPolicyFor('phone', false), 'portrait');
  });
  check('phone, full screen open: landscape allowed', () => {
    assert.equal(orientationPolicyFor('phone', true), 'any');
    assert.equal(contradictsPolicy('any', 'landscape'), false);
    assert.equal(contradictsPolicy('any', 'portrait'), false);
  });
  check('phone after exit: portrait again, landscape contradicts it', () => {
    assert.equal(orientationPolicyFor('phone', true), 'any');
    assert.equal(orientationPolicyFor('phone', false), 'portrait');
    assert.equal(contradictsPolicy('portrait', 'landscape'), true);
    assert.equal(contradictsPolicy('portrait', 'portrait'), false);
  });
  check('tablet is landscape with or without full screen', () => {
    assert.equal(orientationPolicyFor('tablet', false), 'landscape');
    assert.equal(orientationPolicyFor('tablet', true), 'landscape');
    assert.equal(contradictsPolicy('landscape', 'portrait'), true);
    assert.equal(contradictsPolicy('landscape', 'landscape'), false);
  });
  check('an unknown reading is compliant under every policy', () => {
    for (const p of ['portrait', 'landscape', 'any'] as const)
      assert.equal(contradictsPolicy(p, 'unknown'), false);
  });
};

// ---------------------------------------------------------------- part 2
type Listener = (e: {
  orientationInfo: { orientation: number };
  orientationLock: number;
}) => void;
const O = { UNKNOWN: 0, PORTRAIT_UP: 1, PORTRAIT_DOWN: 2, LANDSCAPE_LEFT: 3, LANDSCAPE_RIGHT: 4 };
const L = { DEFAULT: 0, ALL: 1, PORTRAIT: 2, PORTRAIT_UP: 3, PORTRAIT_DOWN: 4, LANDSCAPE: 5, LANDSCAPE_LEFT: 6, LANDSCAPE_RIGHT: 7 };
const lockCalls: number[] = [];
let listener: Listener | null = null;
let deviceClass: 'phone' | 'tablet' = 'phone';
let currentLock = L.DEFAULT;

const fakeOrientation = {
  __esModule: true,
  Orientation: O,
  OrientationLock: L,
  lockAsync: async (lock: number) => {
    lockCalls.push(lock);
    currentLock = lock;
  },
  getOrientationLockAsync: async () => currentLock,
  addOrientationChangeListener: (fn: Listener) => {
    listener = fn;
    return { remove: () => undefined };
  },
  removeOrientationChangeListener: () => {
    listener = null;
  },
};

const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request === 'expo-screen-orientation') return fakeOrientation;
  if (request === 'react-native') return { Platform: { OS: 'android' } };
  if (/(^|\/)useDeviceClass$/.test(request))
    return { __esModule: true, getDeviceClass: () => deviceClass };
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act } from 'react-test-renderer';

const flush = () => act(async () => { await Promise.resolve(); });
const fire = (orientation: number) =>
  act(async () => {
    listener?.({ orientationInfo: { orientation }, orientationLock: currentLock });
    await Promise.resolve();
  });

async function hookChecks() {
  const useOrientationPolicy = require('../hooks/useOrientationPolicy').default;
  const { setVideoFullScreen } = require('../videoFullScreen');
  const Probe = () => {
    useOrientationPolicy();
    return null;
  };
  const mount = async (device: 'phone' | 'tablet') => {
    deviceClass = device;
    setVideoFullScreen(false);
    lockCalls.length = 0;
    currentLock = L.DEFAULT;
    let r!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(Probe));
    });
    return r;
  };
  const setFs = (v: boolean) => act(async () => { setVideoFullScreen(v); await Promise.resolve(); });

  await check('phone: portrait lock on mount; a landscape reading is re-locked to portrait', async () => {
    const r = await mount('phone');
    assert.deepEqual(lockCalls, [L.PORTRAIT_UP]);
    await fire(O.LANDSCAPE_LEFT);
    assert.deepEqual(lockCalls, [L.PORTRAIT_UP, L.PORTRAIT_UP]);
    r.unmount();
  });

  await check('phone: full screen opens -> lock ALL, and a landscape reading is NOT fought', async () => {
    const r = await mount('phone');
    await setFs(true);
    assert.equal(lockCalls[lockCalls.length - 1], L.ALL);
    const before = lockCalls.length;
    await fire(O.LANDSCAPE_LEFT);
    await fire(O.LANDSCAPE_RIGHT);
    await fire(O.PORTRAIT_UP);
    assert.equal(lockCalls.length, before, 'no re-lock while full screen is open');
    r.unmount();
  });

  await check('phone: full screen closes -> portrait lock again, and the listener enforces it', async () => {
    const r = await mount('phone');
    await setFs(true);
    await setFs(false);
    assert.equal(lockCalls[lockCalls.length - 1], L.PORTRAIT_UP);
    const before = lockCalls.length;
    await fire(O.LANDSCAPE_LEFT);
    assert.equal(lockCalls.length, before + 1);
    assert.equal(lockCalls[lockCalls.length - 1], L.PORTRAIT_UP);
    r.unmount();
  });

  await check('phone: full screen left set by a screen that unmounted is cleared by that screen (flag false) -> portrait', async () => {
    const r = await mount('phone');
    await setFs(true);
    await setFs(false); // what LessonScreen's unmount cleanup does
    assert.equal(currentLock, L.PORTRAIT_UP);
    r.unmount();
  });

  await check('tablet: landscape lock regardless of the flag; portrait reading re-locked even in full screen', async () => {
    const r = await mount('tablet');
    assert.deepEqual(lockCalls, [L.LANDSCAPE]);
    await setFs(true);
    assert.equal(lockCalls[lockCalls.length - 1], L.LANDSCAPE);
    const before = lockCalls.length;
    await fire(O.PORTRAIT_UP);
    assert.equal(lockCalls.length, before + 1);
    assert.equal(lockCalls[lockCalls.length - 1], L.LANDSCAPE);
    r.unmount();
  });
}

policyChecks();
hookChecks().then(
  () => {
    console.log(`${passed} checks passed`);
    process.exit(0);
  },
  e => {
    console.error(e);
    process.exit(1);
  },
);
