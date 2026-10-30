/**
 * The real useNavShell hook (edtech-expo#143), rendered over stubbed window,
 * theme, design and device class:
 *  - the phone rule is native only (a web "phone-sized screen" still decides by width);
 *  - while the lesson video is full screen the shell is frozen at the value it
 *    had when full screen opened, on every platform, and follows the width again
 *    after exit.
 * Plain script run by `tsx` (package.json `test:orientation`).
 */
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

let os = 'android';
let width = 411;
let isCorporate = true;
let isPhone = true;
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request === 'react-native')
    return { Platform: { get OS() { return os; } }, useWindowDimensions: () => ({ width, height: 800 }) };
  if (request === 'styled-components/native')
    return { __esModule: true, useTheme: () => ({ breakpoints: { SIDEBAR_MIN_WIDTH: 1280, DEFAULT_MIN_WIDTH: 768 } }) };
  if (/(^|\/)useDesign$/.test(request)) return { __esModule: true, default: () => ({ isCorporate }) };
  if (/(^|\/)useDeviceClass$/.test(request)) return { __esModule: true, default: () => ({ isPhone }) };
  return load.call(this, request, ...rest);
};
// eslint-disable-next-line import/first
import TestRenderer, { act } from 'react-test-renderer';

const useNavShell = require('../hooks/useNavShell').default;
const { setVideoFullScreen } = require('../videoFullScreen');
const { setLessonMounted } = require('../lessonMounted');

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

let seen = '';
const Probe = () => {
  seen = useNavShell().shell;
  return null;
};
const mount = (setup: { os: string; width: number; isPhone: boolean; isCorporate?: boolean }) => {
  os = setup.os;
  width = setup.width;
  isPhone = setup.isPhone;
  isCorporate = setup.isCorporate ?? true;
  setVideoFullScreen(false);
  setLessonMounted(false);
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(React.createElement(Probe)); });
  return r;
};
const rerender = (r: TestRenderer.ReactTestRenderer) => act(() => { r.update(React.createElement(Probe)); });

check('native phone turned to landscape stays tabs', () => {
  const r = mount({ os: 'android', width: 862, isPhone: true });
  assert.equal(seen, 'tabs');
  r.unmount();
});
check('native tablet at 862 is the rail', () => {
  const r = mount({ os: 'android', width: 862, isPhone: false });
  assert.equal(seen, 'rail');
  r.unmount();
});
check('web ignores the device class: a phone-sized "screen" at 862 wide is the rail', () => {
  const r = mount({ os: 'web', width: 862, isPhone: true });
  assert.equal(seen, 'rail');
  r.unmount();
});
check('web, lesson opened at 390: crossing 768 does not swap the shell, in full screen or after leaving it; after leaving the lesson it does', () => {
  const r = mount({ os: 'web', width: 390, isPhone: false });
  assert.equal(seen, 'tabs');
  act(() => { setLessonMounted(true); setVideoFullScreen(true); });
  width = 844; rerender(r);
  assert.equal(seen, 'tabs', 'frozen while full screen');
  act(() => { setVideoFullScreen(false); });
  assert.equal(seen, 'tabs', 'still frozen after Exit full screen: the lesson is still mounted');
  act(() => { setLessonMounted(false); });
  assert.equal(seen, 'rail', 'live again after leaving the lesson');
  r.unmount();
});
check('web: full screen alone (no lesson flag) still freezes, and exit unfreezes', () => {
  const r = mount({ os: 'web', width: 390, isPhone: false });
  act(() => { setVideoFullScreen(true); });
  width = 844; rerender(r);
  assert.equal(seen, 'tabs');
  act(() => { setVideoFullScreen(false); });
  assert.equal(seen, 'rail');
  r.unmount();
});
check('native tablet: full screen opened in the rail stays the rail when narrowed', () => {
  const r = mount({ os: 'android', width: 1000, isPhone: false });
  assert.equal(seen, 'rail');
  act(() => { setVideoFullScreen(true); });
  width = 500; rerender(r);
  assert.equal(seen, 'rail');
  act(() => { setVideoFullScreen(false); });
  assert.equal(seen, 'tabs');
  r.unmount();
});
console.log(`${passed} checks passed`);
