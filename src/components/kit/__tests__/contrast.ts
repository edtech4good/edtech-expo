/**
 * WCAG contrast of the colour pairs the kit draws, computed from the real
 * corporate tokens (not copied hex). Text needs 4.5:1; borders, icons and
 * glyphs that identify a control or a state need 3:1 (1.4.11). Tints are
 * composited on white first, as in the design page's contrast table.
 *
 * Also proves the MCQ fix: the old selected-text colour (`selection`,
 * #078A95) is 4.14:1 on white, under 4.5, and the new `selectionText` token
 * passes, in both themes.
 *
 * Plain script run by `tsx` (package.json `test:kit`).
 */
import assert from 'node:assert/strict';
import corporate from '../../../themes/tokens/corporate';
import kids from '../../../themes/tokens/kids';
import { CORRECT_TINT_ALPHA, INCORRECT_TINT_ALPHA } from '../tileStyle';

const C = corporate.colors;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function over(fg: string, alpha: number, bg: string): string {
  const f = rgb(fg);
  const b = rgb(bg);
  return (
    '#' +
    f
      .map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)))
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

const mint = over(C.success, CORRECT_TINT_ALPHA, C.surface);
const orange = over(C.error, INCORRECT_TINT_ALPHA, C.surface);

// [name, foreground, background, minimum]
const PAIRS: Array<[string, string, string, number]> = [
  ['Tile text on white', C.onBackground, C.surface, 4.5],
  ['Picked text on picked fill', C.primaryDark, C.primaryLight, 4.5],
  ['Picked border (UI) on white', C.primary, C.surface, 3],
  ['Active blank border (UI) on its fill', C.primary, C.primaryLight, 3],
  ['Grip glyph (UI) on white', C.placeholder, C.surface, 3],
  ['Audio glyph and outline (UI) on white', C.primary, C.surface, 3],
  ['Audio pause glyph on filled blue', C.onPrimary, C.primary, 4.5],
  ['Listen label on white', C.primary, C.surface, 4.5],
  ['Listen label on filled blue', C.onPrimary, C.primary, 4.5],
  ['Audio error label on white', C.error, C.surface, 4.5],
  ['Empty slot text on slot fill', C.onSurfaceVariant, C.surfaceVariant, 4.5],
  ['"Place here" on white', C.primary, C.surface, 4.5],
  ['Filled slot text on white', C.onBackground, C.surface, 4.5],
  ['✓ glyph on mint disc (UI)', C.onSuccess, C.success, 3],
  ['✕ glyph on error disc (UI)', C.onPrimary, C.error, 3],
  ['"Correct" title on mint tint', C.successText, mint, 4.5],
  ['"Not quite" title on orange tint', C.errorText, orange, 4.5],
  ['Strip summary on mint tint', C.onSurface, mint, 4.5],
  ['Strip summary on orange tint', C.onSurface, orange, 4.5],
  ['Tile text on mint tint', C.onBackground, mint, 4.5],
  ['Tile text on orange tint', C.onBackground, orange, 4.5],
  ['Selected option text on white (MCQ fix)', C.selectionText, C.surface, 4.5],
  ['Selection ring (UI) on white', C.selection, C.surface, 3],
];

for (const [name, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  assert.ok(r >= min, `${name}: ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
  console.log(`ok  ${r.toFixed(2)}:1 (min ${min})  ${name}`);
}

// The tint case that needed a new token: plain `error` misses 4.5 there.
assert.ok(ratio(C.error, orange) < 4.5, 'error on the orange tint should be under 4.5 (that is why errorText exists)');

// The MCQ fix, stated as numbers.
const before = ratio('#078A95', C.surface);
const after = ratio(C.selectionText, C.surface);
assert.ok(before < 4.5, `the old teal should fail as text (${before.toFixed(2)})`);
assert.ok(after >= 4.5);
assert.equal(C.selection, '#078A95', 'the ring keeps the original teal');
assert.ok(ratio(kids.colors.selectionText, kids.colors.surface) >= 4.5, 'kids token passes on white too');
console.log(`ok  MCQ selected text: ${before.toFixed(2)}:1 -> ${after.toFixed(2)}:1`);

console.log('\nall contrast checks passed');
