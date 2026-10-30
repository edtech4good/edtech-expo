/**
 * Leaving the lesson while its video is full screen gives the portrait lock
 * back (edtech-expo#143): useFullScreenCleanup, called by LessonScreen,
 * clears the shared flag on unmount and leaves the browser's full screen.
 * Plain script run by `tsx` (package.json `test:fullscreen`).
 */
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

let platform = 'android';
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request === 'react-native') return { Platform: { get OS() { return platform; } } };
  return load.call(this, request, ...rest);
};
// eslint-disable-next-line import/first
import TestRenderer, { act } from 'react-test-renderer';

const useFullScreenCleanup = require('../useFullScreenCleanup').default;
const { setVideoFullScreen, isVideoFullScreen } = require('../../../services/videoFullScreen');

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

let left = 0;
const Probe = () => {
  useFullScreenCleanup(() => { left += 1; });
  return null;
};
const mount = () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(React.createElement(Probe)); });
  return r;
};

check('unmounting the lesson while full screen is open clears the flag and tells the screen', () => {
  setVideoFullScreen(false);
  left = 0;
  const r = mount();
  setVideoFullScreen(true);
  assert.equal(isVideoFullScreen(), true);
  act(() => { r.unmount(); });
  assert.equal(isVideoFullScreen(), false);
  assert.equal(left, 1);
});

check('while mounted the hook leaves the flag alone', () => {
  setVideoFullScreen(true);
  const r = mount();
  assert.equal(isVideoFullScreen(), true);
  act(() => { r.unmount(); });
  assert.equal(isVideoFullScreen(), false);
});

check('web: unmounting leaves the browser full screen', () => {
  platform = 'web';
  let exited = 0;
  (globalThis as any).document = {
    fullscreenElement: {},
    exitFullscreen: () => { exited += 1; return Promise.resolve(); },
  };
  const r = mount();
  act(() => { r.unmount(); });
  assert.equal(exited, 1);
  delete (globalThis as any).document;
  platform = 'android';
});

console.log(`${passed} checks passed`);
