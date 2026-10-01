/**
 * The tile and slot state -> style mapping (kit/tileStyle.ts), against the
 * real corporate tokens. Guards the design's rules: which states are raised,
 * which show the grip, which carry a result mark, that a border never gets
 * thinner or fatter than the mockup, that no state reuses another's look, and
 * that no colour is hard-coded (every colour is one of the theme's tokens or
 * a tint of one).
 *
 * Plain script run by `tsx` (package.json `test:kit`).
 */
import assert from 'node:assert/strict';
import corporate from '../../../themes/tokens/corporate';
import hexAlpha from '../../../utils/hexAlpha';
import { slotFrame, SLOT_STATES, tileFrame, TILE_STATES, tileFrameStyle } from '../tileStyle';

const C = corporate.colors;

// 1. Every state exists and is distinguishable.
const seen = new Set<string>();
for (const s of TILE_STATES) {
  const f = tileFrame(C, s);
  seen.add(JSON.stringify(f));
}
assert.equal(seen.size, TILE_STATES.length, 'every tile state looks different from the others');
const slotSeen = new Set(SLOT_STATES.map(s => JSON.stringify(slotFrame(C, s))));
assert.equal(slotSeen.size, SLOT_STATES.length, 'every slot state looks different');
console.log('ok  all', TILE_STATES.length, 'tile states and', SLOT_STATES.length, 'slot states are distinct');

// 2. Tile rules.
const d = tileFrame(C, 'default');
assert.deepEqual(
  { bg: d.backgroundColor, edge: d.borderColor, w: d.borderWidth, raised: d.raised, grip: d.showGrip, mark: d.mark },
  { bg: C.surface, edge: C.outline, w: 1.5, raised: true, grip: true, mark: null },
);
const p = tileFrame(C, 'picked');
assert.deepEqual([p.borderColor, p.backgroundColor, p.borderWidth, p.textColor], [C.primary, C.primaryLight, 2, C.primaryDark]);
assert.equal(p.raised, true);
const g = tileFrame(C, 'dragging');
assert.equal(g.lifted, true);
assert.equal(g.borderColor, C.primary);
const ok = tileFrame(C, 'correct');
assert.equal(ok.mark, 'correct');
assert.equal(ok.borderColor, C.success);
assert.equal(ok.backgroundColor, hexAlpha(C.success, 0.1));
assert.equal(ok.raised, false);
assert.equal(ok.showGrip, false);
const bad = tileFrame(C, 'incorrect');
assert.equal(bad.mark, 'incorrect');
assert.equal(bad.borderColor, C.error);
assert.equal(bad.backgroundColor, hexAlpha(C.error, 0.08));
for (const s of ['placed', 'disabled', 'correct', 'incorrect'] as const) {
  assert.equal(tileFrame(C, s).showGrip, false, `${s} hides the grip`);
  assert.equal(tileFrame(C, s).raised, false, `${s} is flat`);
}
for (const s of ['default', 'picked', 'dragging'] as const) {
  assert.equal(tileFrame(C, s).showGrip, true, `${s} shows the grip`);
}
console.log('ok  tile rules');

// 3. A tile keeps its size between states: border + padding is constant
// for the states that share a frame (1.5x2 + 9 + 14 = 26; 2x2 + 8.5 + 13.5 = 26).
for (const s of ['default', 'picked', 'dragging'] as const) {
  const f = tileFrame(C, s);
  const total = f.borderWidth * 2 + f.paddingLeft + f.paddingRight;
  assert.equal(total, 26, `${s} horizontal chrome`);
}
console.log('ok  picked and dragging keep the default width');

// 4. Only theme tokens: every colour in every frame is a token or a tint.
const tokens = new Set(Object.values(C).filter((v): v is string => typeof v === 'string'));
const tints = [hexAlpha(C.success, 0.1), hexAlpha(C.error, 0.08)];
for (const s of TILE_STATES) {
  const f = tileFrame(C, s);
  for (const c of [f.backgroundColor, f.borderColor, f.textColor]) {
    assert.ok(tokens.has(c) || tints.includes(c), `${s}: ${c} is not a theme token`);
  }
}
for (const s of SLOT_STATES) {
  const f = slotFrame(C, s);
  for (const c of [f.backgroundColor, f.borderColor, f.textColor]) {
    assert.ok(tokens.has(c) || tints.includes(c), `slot ${s}: ${c} is not a theme token`);
  }
}
console.log('ok  no hard-coded colours');

// 5. Slot rules.
assert.equal(slotFrame(C, 'empty').borderStyle, 'dashed');
assert.equal(slotFrame(C, 'target').borderStyle, 'dashed');
assert.equal(slotFrame(C, 'filled').borderStyle, 'solid');
assert.equal(slotFrame(C, 'active').caret, true);
assert.equal(SLOT_STATES.filter(s => slotFrame(C, s).caret).length, 1, 'only the active blank has a caret');
assert.equal(slotFrame(C, 'correct').borderColor, C.success);
assert.equal(slotFrame(C, 'incorrect').borderColor, C.error);
console.log('ok  slot rules');

// 6. The list-frame helper carries the result look (and no shadow) and nothing else.
assert.deepEqual(Object.keys(tileFrameStyle(C, 'correct')).sort(), [
  'backgroundColor',
  'borderColor',
  'borderWidth',
  'elevation',
  'paddingLeft',
  'paddingRight',
  'shadowOpacity',
]);
assert.equal(tileFrameStyle(C, 'incorrect').borderColor, C.error);
assert.equal(tileFrameStyle(C, 'correct'), tileFrameStyle(C, 'correct'), 'same reference every call');
assert.notEqual(tileFrameStyle(C, 'correct'), tileFrameStyle(C, 'incorrect'));
console.log('ok  tileFrameStyle (stable references)');

console.log('\nall tile style checks passed');

// 9. A result tile is flat: its translucent tint would show a shadow through
// it on Android (the tile turned grey), so the frame cancels the resting
// shadow. Raised states do not cancel it.
for (const s of ['correct', 'incorrect', 'placed', 'disabled'] as const) {
  const st = tileFrameStyle(C, s) as { elevation?: number; shadowOpacity?: number };
  assert.equal(st.elevation, 0, `${s} has no elevation`);
  assert.equal(st.shadowOpacity, 0, `${s} has no shadow`);
}
for (const s of ['default', 'picked'] as const) {
  assert.equal((tileFrameStyle(C, s) as { elevation?: number }).elevation, undefined, `${s} keeps the raised shadow`);
}
console.log('ok  result frames are flat (elevation 0)');
