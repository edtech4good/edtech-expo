/**
 * Nav shell choice (edtech-expo#143): a phone stays on the corporate bottom
 * tabs when it turns to landscape for the lesson video's full screen. By
 * width alone a landscape phone (~860 dp) is the tablet rail; the home layout
 * swaps Tabs for Drawer there and remounts the lesson under it. Observed on
 * the emulator 30 Oct 2026: turning the phone in full screen dropped the
 * learner on Home.
 * Plain script run by `tsx` (package.json `test:orientation`).
 */
import assert from 'node:assert/strict';
import { navShellFor, resolveShell } from '../navShell';

const BP = { sidebarMinWidth: 1280, defaultMinWidth: 768 };
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
const shell = (isCorporate: boolean, width: number, isPhone: boolean) =>
  navShellFor({ isCorporate, width, isPhone, ...BP });

check('corporate phone in portrait: tabs', () => assert.equal(shell(true, 411, true), 'tabs'));
check('corporate phone turned to landscape (862 dp): still tabs, not the rail', () => {
  assert.equal(shell(true, 862, true), 'tabs');
  assert.equal(shell(true, 915, true), 'tabs');
});
check('corporate tablet: rail at 768..1279, sidebar from 1280, tabs below 768', () => {
  assert.equal(shell(true, 1000, false), 'rail');
  assert.equal(shell(true, 1280, false), 'sidebar');
  assert.equal(shell(true, 600, false), 'tabs');
});
check('kids theme is the drawer at any width, phone or not', () => {
  for (const w of [411, 862, 1280]) for (const p of [true, false]) assert.equal(shell(false, w, p), 'drawer');
});

check('resolveShell: not full screen follows the live shell and keeps nothing', () => {
  assert.deepEqual(resolveShell('rail', false, 'tabs'), { shell: 'rail', frozen: null });
});
check('resolveShell: full screen freezes the shell it opened with, whatever the width does after', () => {
  const opened = resolveShell('tabs', true, null);
  assert.deepEqual(opened, { shell: 'tabs', frozen: 'tabs' });
  assert.deepEqual(resolveShell('rail', true, opened.frozen), { shell: 'tabs', frozen: 'tabs' });
  assert.deepEqual(resolveShell('sidebar', true, 'tabs'), { shell: 'tabs', frozen: 'tabs' });
});
console.log(`${passed} checks passed`);
