/**
 * Shared mascot choices: clip to file, the random character (seeded, both
 * reachable, in range), the play config (idle loops, pass/try-again play once,
 * reduced motion never plays), and the six delivered artwork files (600x800,
 * 30fps, vector only), plus the structural guarantees of the shared component.
 *
 * Plain script run by `tsx` (package.json `test:mascot`).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  IDLE_STILL_PROGRESS,
  MASCOT_ASPECT,
  mascotFile,
  mascotHeight,
  MASCOT_CHARACTERS,
  pickCharacter,
  playConfig,
} from '../mascotLogic';

// Clip to file.
assert.equal(mascotFile('bear', 'pass'), 'bear-pass.json');
assert.equal(mascotFile('rabbit', 'try-again'), 'rabbit-try-again.json');
assert.equal(mascotFile('bear', 'idle'), 'bear-idle.json');
assert.equal(mascotFile('rabbit', 'idle'), 'rabbit-idle.json');
console.log('ok  clip to file');

// Random character: edges of the range, and a seeded stream reaches both.
assert.equal(pickCharacter(() => 0), 'bear');
assert.equal(pickCharacter(() => 0.4999), 'bear');
assert.equal(pickCharacter(() => 0.5), 'rabbit');
assert.equal(pickCharacter(() => 0.9999), 'rabbit');
assert.equal(pickCharacter(() => 1), 'rabbit'); // never out of range
assert.equal(pickCharacter(() => -1), 'bear');
let seed = 12345;
const lcg = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const seen = new Set<string>();
for (let i = 0; i < 50; i++) seen.add(pickCharacter(lcg));
assert.deepEqual([...seen].sort(), ['bear', 'rabbit']);
assert.deepEqual([...MASCOT_CHARACTERS], ['bear', 'rabbit']);
console.log('ok  random character');

// pass and try-again play once (default clip too); idle loops; `loop` overrides.
for (const clip of ['pass', 'try-again'] as const) {
  const motion = playConfig(false, clip);
  assert.equal(motion.loop, false, `${clip} must not loop`);
  assert.equal(motion.autoPlay, true);
}
assert.equal(playConfig(false).loop, false);
const idle = playConfig(false, 'idle');
assert.equal(idle.loop, true, 'idle loops');
assert.equal(idle.autoPlay, true);
assert.equal(playConfig(false, 'idle', false).loop, false);
assert.equal(playConfig(false, 'pass', true).loop, true);
// Reduced motion: never autoplay, never loop, one still frame: the last for
// pass/try-again, the first (neutral pose) for idle.
for (const clip of ['pass', 'try-again', 'idle'] as const) {
  const still = playConfig(true, clip, true);
  assert.equal(still.loop, false, `${clip} reduced: no loop`);
  assert.equal(still.autoPlay, false, `${clip} reduced: no autoplay`);
  assert.equal(still.staticProgress, clip === 'idle' ? IDLE_STILL_PROGRESS : 1);
}
console.log('ok  play config');

// Size keeps 3:4 and is smaller when compact.
assert.equal(MASCOT_ASPECT, 0.75);
assert.ok(mascotHeight(false) >= 160 && mascotHeight(false) <= 200);
assert.ok(mascotHeight(true) < mascotHeight(false));
console.log('ok  size');

// The delivered files: every one the app can request exists, is 600x800 at
// 30fps, and has no image assets (pure vector).
const dir = path.resolve(__dirname, '../../../../public/mascots');
for (const c of MASCOT_CHARACTERS)
  for (const clip of ['pass', 'try-again', 'idle'] as const) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, mascotFile(c, clip)), 'utf8'));
    assert.equal(j.w, 600, `${c}-${clip} width`);
    assert.equal(j.h, 800, `${c}-${clip} height`);
    assert.equal(j.fr, 30, `${c}-${clip} fps`);
    assert.ok(!(j.assets ?? []).some((a: { p?: string }) => a.p), `${c}-${clip} has image assets`);
  }
console.log('ok  artwork files');

// Web player must keep the last frame: without `keepLastFrame` react-lottie-player
// 3.6.0 seeks back to frame 0 when the clip ends and the final pose is lost.
const webPlayer = fs.readFileSync(path.resolve(__dirname, '../MascotPlayer.web.tsx'), 'utf8');
assert.match(webPlayer, /^\s*keepLastFrame\s*$/m, 'MascotPlayer.web.tsx must pass keepLastFrame');
assert.match(webPlayer, /loop=\{loop\}/, 'MascotPlayer.web.tsx must take loop from its props (idle loops, others do not)');
assert.ok(!/loop=\{true\}/.test(webPlayer), 'MascotPlayer.web.tsx must not hard-code a loop');
console.log('ok  web player keeps last frame');

// Native now serves every clip, idle included (the owner accepted the extra
// ~186 KB in the native bundle): all six must have a loader.
const native = fs.readFileSync(path.resolve(__dirname, '../mascotSources.ts'), 'utf8');
for (const c of MASCOT_CHARACTERS)
  for (const clip of ['pass', 'try-again', 'idle'])
    assert.match(native, new RegExp(`require\\('[^']*${c}-${clip}\\.json'\\)`), `native loader for ${c}-${clip}`);
console.log('ok  native loaders include idle');

// Containment: the mascot is decoration, so each renderer's default export must
// be wrapped in MascotBoundary (a failed chunk or player must not blank the
// result screen), and the boundary must swallow, not rethrow.
for (const f of ['Mascot.tsx', 'Mascot.web.tsx']) {
  const src = fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
  assert.match(src, /<MascotBoundary>[\s\S]*<MascotInner[\s\S]*<\/MascotBoundary>/, `${f} must wrap the mascot in MascotBoundary`);
  // A load failure must leave no reserved box behind.
  assert.match(src, /failed\) return null/, `${f} must render nothing when the artwork fails`);
}
const boundary = fs.readFileSync(path.resolve(__dirname, '../MascotBoundary.tsx'), 'utf8');
assert.match(boundary, /getDerivedStateFromError/);
assert.ok(!/\bthrow\b/.test(boundary), 'MascotBoundary must never rethrow');
// Dev must not use the lazy chunk path (HMRClient.setup() is never called by this app's entry).
const webIll = fs.readFileSync(path.resolve(__dirname, '../Mascot.web.tsx'), 'utf8');
assert.match(webIll, /NODE_ENV === 'production'[\s\S]*import\('\.\/MascotPlayer'\)[\s\S]*require\('\.\/MascotPlayer'\)/, 'lazy chunk only in production; require in dev');
console.log('ok  mascot failure is contained');
