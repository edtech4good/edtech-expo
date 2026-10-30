/**
 * No false "watched" on a remount (edtech-expo#143): the no-media completion
 * may only be posted for an item whose player has never loaded real media.
 * Pure; run by `tsx` (package.json `test:fullscreen`).
 */
import assert from 'node:assert/strict';
import { hasLoadedMedia, mayPostNoMediaCompletion } from '../noMediaCompletion';

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

check('an item that never loaded may post the no-media completion, once', () => {
  assert.equal(mayPostNoMediaCompletion({ everLoaded: false, alreadyPosted: false }), true);
  assert.equal(mayPostNoMediaCompletion({ everLoaded: false, alreadyPosted: true }), false);
});

check('a player that loaded and then fails (a failed reload after full screen) posts nothing', () => {
  assert.equal(mayPostNoMediaCompletion({ everLoaded: true, alreadyPosted: false }), false);
  assert.equal(mayPostNoMediaCompletion({ everLoaded: true, alreadyPosted: true }), false);
});

check('"loaded" means a real duration, not just isLoaded (the web says isLoaded before any data)', () => {
  assert.equal(hasLoadedMedia({ isLoaded: true, durationMillis: 19949 }), true);
  assert.equal(hasLoadedMedia({ isLoaded: true, durationMillis: NaN }), false);
  assert.equal(hasLoadedMedia({ isLoaded: true }), false);
  assert.equal(hasLoadedMedia({ isLoaded: true, durationMillis: 0 }), false);
  assert.equal(hasLoadedMedia({ isLoaded: false, durationMillis: 5000 }), false);
});

console.log(`${passed} checks passed`);
