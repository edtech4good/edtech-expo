/**
 * The announcement rules (kit/announcerLogic.ts) for the result strip:
 * native (iOS and Android) makes exactly one announce call and never touches
 * a web region; the web fills an always-mounted region that starts empty,
 * clears before every fill so identical words are read again, and a newer
 * announcement replaces one still waiting.
 *
 * Plain script run by `tsx` (package.json `test:kit`).
 */
import assert from 'node:assert/strict';
import {
  AnnouncerPlatform,
  createAnnouncer,
  INITIAL_REGION_TEXT,
  needsRegion,
  REGION_FILL_DELAY_MS,
} from '../announcerLogic';

function harness(platform: AnnouncerPlatform) {
  const calls: string[] = [];
  const timers: Array<{ fn: () => void; ms: number; live: boolean }> = [];
  const a = createAnnouncer({
    platform,
    announceNative: t => calls.push(`native:${t}`),
    setRegionText: t => calls.push(`region:${t}`),
    schedule: (fn, ms) => {
      timers.push({ fn, ms, live: true });
      return timers.length - 1;
    },
    cancel: h => {
      timers[h as number].live = false;
    },
  });
  const flush = () => timers.forEach(t => t.live && ((t.live = false), t.fn()));
  return { a, calls, timers, flush };
}

// 1. The web region exists (needed) and starts empty.
assert.equal(needsRegion('web'), true);
assert.equal(INITIAL_REGION_TEXT, '');
console.log('ok  web needs a region and it starts empty');

// 2. Native: exactly one announce call, no region use, on both platforms.
for (const p of ['ios', 'android'] as const) {
  const h = harness(p);
  h.a.announce('Not quite. 4 of 6 are in the right place.');
  h.flush();
  assert.deepEqual(h.calls, ['native:Not quite. 4 of 6 are in the right place.']);
  assert.equal(h.timers.length, 0);
  assert.equal(needsRegion(p), false, `${p} renders no region (no live region on Android)`);
}
console.log('ok  native: a single announce, no region');

// 3. Web: the text arrives after the region is cleared, never in the same tick.
{
  const h = harness('web');
  h.a.announce('Correct. All 6 are in the right place.');
  assert.deepEqual(h.calls, ['region:'], 'region is cleared first, text not yet set');
  assert.equal(h.timers[0].ms, REGION_FILL_DELAY_MS);
  h.flush();
  assert.deepEqual(h.calls, ['region:', 'region:Correct. All 6 are in the right place.']);
  assert.ok(!h.calls.some(c => c.startsWith('native:')), 'web does not call the native announcer');
  console.log('ok  web: region exists empty, then the text arrives');
}

// 4. Web: the same words twice are announced twice (clear, then fill each time).
{
  const h = harness('web');
  h.a.announce('Not quite.');
  h.flush();
  h.a.announce('Not quite.');
  h.flush();
  assert.deepEqual(h.calls, ['region:', 'region:Not quite.', 'region:', 'region:Not quite.']);
  console.log('ok  web: identical text re-announces');
}

// 5. Web: a newer announcement replaces one still waiting; empty text is ignored; dispose cancels.
{
  const h = harness('web');
  h.a.announce('first');
  h.a.announce('second');
  h.flush();
  assert.deepEqual(h.calls, ['region:', 'region:', 'region:second']);
  h.a.announce('');
  h.a.announce('third');
  h.a.dispose();
  h.flush();
  assert.equal(h.calls[h.calls.length - 1], 'region:', 'a disposed announcer never fills the region');
  console.log('ok  web: latest wins, empty ignored, dispose cancels');
}

console.log('\nall announcer checks passed');
