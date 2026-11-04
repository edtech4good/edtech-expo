/**
 * The inline lesson player's box beside a permanent nav (a desktop sidebar or
 * a tablet rail). Pure; run by `tsx` (package.json `test:fullscreen`).
 */
import assert from 'node:assert/strict';
import {
  controlBarWidth,
  INLINE_BAR_HEIGHT_ESTIMATE,
  inlinePlayerLayout,
} from '../inlinePlayerLayout';

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

const SIDEBAR = 248;
const RAIL = 88;

check('desktop 1600x900 with the sidebar: the player is the window minus the sidebar', () => {
  const l = inlinePlayerLayout({
    window: { width: 1600, height: 900 },
    navWidth: SIDEBAR,
    offlineBannerHeight: 0,
  });
  assert.equal(l.availableWidth, 1352);
  assert.deepEqual(l.box, { width: 1352, height: 900 });
  assert.equal(l.isPortrait, false);
});

check('tablet 1024x768 with the rail: the player is the window minus the rail', () => {
  const l = inlinePlayerLayout({
    window: { width: 1024, height: 768 },
    navWidth: RAIL,
    offlineBannerHeight: 0,
  });
  assert.deepEqual(l.box, { width: 936, height: 768 });
});

check('the offline banner still comes off the landscape height', () => {
  const l = inlinePlayerLayout({
    window: { width: 1024, height: 768 },
    navWidth: RAIL,
    offlineBannerHeight: 40,
  });
  assert.deepEqual(l.box, { width: 936, height: 728 });
});

check('phone portrait 390x844, no nav: unchanged, full width at 16:9', () => {
  const l = inlinePlayerLayout({
    window: { width: 390, height: 844 },
    navWidth: 0,
    offlineBannerHeight: 0,
  });
  assert.equal(l.isPortrait, true);
  assert.deepEqual(l.box, { width: 390, height: 219 });
});

check('phone landscape 844x390, no nav: unchanged, the whole window', () => {
  const l = inlinePlayerLayout({
    window: { width: 844, height: 390 },
    navWidth: 0,
    offlineBannerHeight: 0,
  });
  assert.deepEqual(l.box, { width: 844, height: 390 });
});

check('portrait tablet beside the rail: 16:9 of the room left, orientation from the window', () => {
  const l = inlinePlayerLayout({
    window: { width: 800, height: 1280 },
    navWidth: RAIL,
    offlineBannerHeight: 0,
  });
  assert.equal(l.isPortrait, true);
  assert.deepEqual(l.box, { width: 712, height: 401 });
});

check('the box never goes negative when the nav is wider than the window', () => {
  const l = inlinePlayerLayout({
    window: { width: 200, height: 100 },
    navWidth: SIDEBAR,
    offlineBannerHeight: 500,
  });
  assert.deepEqual(l.box, { width: 0, height: 0 });
});

check('bar below, 1600x900: 16:9 of the room fits, the bar keeps its own height', () => {
  const l = inlinePlayerLayout({
    window: { width: 1600, height: 900 },
    navWidth: SIDEBAR,
    offlineBannerHeight: 0,
    barBelow: true,
    barHeight: 140,
  });
  assert.deepEqual(l.box, { width: 1352, height: 760 });
  assert.ok(l.box.height + 140 <= 900, 'video + bar fit the window');
});

check('bar below, 1280x800: video shrinks to what the bar leaves, never overlapping it', () => {
  const l = inlinePlayerLayout({
    window: { width: 1280, height: 800 },
    navWidth: SIDEBAR,
    offlineBannerHeight: 0,
    barBelow: true,
    barHeight: 150,
  });
  assert.equal(l.box.width, 1032);
  assert.equal(l.box.height, 581);
  assert.ok(l.box.height + 150 <= 800);
});

check('bar below, a short window: height = room minus bar, not the 16:9 height', () => {
  const l = inlinePlayerLayout({
    window: { width: 1280, height: 600 },
    navWidth: SIDEBAR,
    offlineBannerHeight: 0,
    barBelow: true,
    barHeight: 150,
  });
  assert.deepEqual(l.box, { width: 1032, height: 450 });
});

check('bar below counts the offline banner too', () => {
  const l = inlinePlayerLayout({
    window: { width: 1280, height: 600 },
    navWidth: SIDEBAR,
    offlineBannerHeight: 40,
    barBelow: true,
    barHeight: 150,
  });
  assert.equal(l.box.height, 410);
});

check('bar below never goes negative when the bar is taller than the window', () => {
  const l = inlinePlayerLayout({
    window: { width: 1280, height: 100 },
    navWidth: SIDEBAR,
    offlineBannerHeight: 0,
    barBelow: true,
    barHeight: 150,
  });
  assert.equal(l.box.height, 0);
});

check('the stacked bar estimate is positive', () => {
  assert.ok(INLINE_BAR_HEIGHT_ESTIMATE > 0);
});

check('control bar: the 720 cap holds on a wide screen', () => {
  assert.equal(controlBarWidth(720, 1352), 720);
});

check('control bar: never wider than the room a 768 window leaves beside the rail', () => {
  assert.equal(controlBarWidth(720, 768 - RAIL), 680);
});

check('control bar: a phone keeps its full width', () => {
  assert.equal(controlBarWidth(390, 390), 390);
});

console.log(`${passed} passed`);
