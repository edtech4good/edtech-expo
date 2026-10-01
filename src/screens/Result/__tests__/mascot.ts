/**
 * Mascot choices for the result screen: band to clip to file, the random
 * character (seeded, both reachable, in range), the play-once config, and the
 * six delivered artwork files (600x800, 30fps, vector only).
 *
 * Plain script run by `tsx` (package.json `test:result`).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  clipForBand,
  MASCOT_ASPECT,
  mascotFile,
  mascotHeight,
  MASCOT_CHARACTERS,
  pickCharacter,
  playConfig,
} from '../mascot';

// Band to file: pass plays pass; close and far both play try-again.
assert.equal(clipForBand('passed'), 'pass');
assert.equal(clipForBand('close'), 'try-again');
assert.equal(clipForBand('far'), 'try-again');
assert.equal(mascotFile('bear', clipForBand('passed')), 'bear-pass.json');
assert.equal(mascotFile('rabbit', clipForBand('close')), 'rabbit-try-again.json');
assert.equal(mascotFile('rabbit', clipForBand('far')), 'rabbit-try-again.json');
console.log('ok  band to file');

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

// Play once, never loop; reduced motion does not autoplay and holds the last frame.
const motion = playConfig(false);
assert.equal(motion.loop, false);
assert.equal(motion.autoPlay, true);
const still = playConfig(true);
assert.equal(still.loop, false);
assert.equal(still.autoPlay, false);
assert.equal(still.staticProgress, 1);
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
assert.match(webPlayer, /loop=\{false\}/, 'MascotPlayer.web.tsx must not loop');
console.log('ok  web player keeps last frame');

// Native must not bundle the unused idle clips (a build-time require pulls them in).
const native = fs.readFileSync(path.resolve(__dirname, '../mascotSources.ts'), 'utf8');
assert.ok(!/require\([^)]*idle/.test(native), 'mascotSources.ts must not require idle clips');
assert.ok(/require\([^)]*bear-pass/.test(native) && /require\([^)]*rabbit-try-again/.test(native));
console.log('ok  native loaders exclude idle');

// Containment: the mascot is decoration, so each renderer's default export must
// be wrapped in MascotBoundary (a failed chunk or player must not blank the
// result screen), and the boundary must swallow, not rethrow.
for (const f of ['ResultIllustration.tsx', 'ResultIllustration.web.tsx']) {
  const src = fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
  assert.match(src, /<MascotBoundary>[\s\S]*<ResultIllustrationInner[\s\S]*<\/MascotBoundary>/, `${f} must wrap the mascot in MascotBoundary`);
}
const boundary = fs.readFileSync(path.resolve(__dirname, '../MascotBoundary.tsx'), 'utf8');
assert.match(boundary, /getDerivedStateFromError/);
assert.ok(!/\bthrow\b/.test(boundary), 'MascotBoundary must never rethrow');
// Dev must not use the lazy chunk path (HMRClient.setup() is never called by this app's entry).
const webIll = fs.readFileSync(path.resolve(__dirname, '../ResultIllustration.web.tsx'), 'utf8');
assert.match(webIll, /NODE_ENV === 'production'[\s\S]*import\('\.\/MascotPlayer'\)[\s\S]*require\('\.\/MascotPlayer'\)/, 'lazy chunk only in production; require in dev');
console.log('ok  mascot failure is contained');
