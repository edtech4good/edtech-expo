/**
 * Picture-choice layout rules that can be asserted without a browser:
 *  - the tile row grows past its box (flexGrow, never flex: 1) so it scrolls
 *    from the first tile instead of clipping it off the left edge;
 *  - the answer box has a floor at least one tile tall;
 *  - the tile size is clamped to the answer box's MEASURED height (not the
 *    window height minus a guess), and the box has no hard minHeight, so on
 *    a screen that does not scroll Submit can never be pushed off it;
 *  - the renderers actually call those helpers (wiring), since a correct
 *    helper that nothing calls protects nobody.
 *
 * Plain script run by `tsx` (package.json `test:layout`). The pixel-level
 * behaviour (first tile visible at 375 wide, Submit reachable at 812x375)
 * was checked in a real browser; see the PR.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MIN_TILE_SIZE,
  arrangeTileReserve,
  choiceTileReserve,
  imageTileSize,
  tileRowContentStyle,
} from '../MCQImage/layout';

const layouts = { divider: 1, large: 16 };
const src = (rel: string) =>
  readFileSync(join(__dirname, '..', '..', '..', '..', rel), 'utf8');

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check('tile row grows past its box: flexGrow 1, no flex', () => {
  const style = tileRowContentStyle(layouts) as Record<string, unknown>;
  assert.equal(style.flexGrow, 1);
  assert.equal('flex' in style, false, 'flex: 1 pins the row to the box width');
  assert.equal(style.justifyContent, 'center');
  assert.equal(style.alignItems, 'center');
});

check('tile row keeps a gutter so the first tile is not flush to the edge', () => {
  assert.equal(tileRowContentStyle(layouts).paddingHorizontal, layouts.large);
});

const reserve = choiceTileReserve(layouts);

check('a tall box keeps the breakpoint tile size', () => {
  for (const bp of [150, 175, 256]) {
    assert.equal(imageTileSize({ breakpointSize: bp, available: 600 - reserve }), bp);
  }
});

check('an exactly-fitting box keeps the breakpoint size; one dp less shrinks it', () => {
  assert.equal(imageTileSize({ breakpointSize: 150, available: 150 }), 150);
  assert.equal(imageTileSize({ breakpointSize: 150, available: 149 }), 149);
});

check('a short measured box shrinks the tile to fit it (landscape phone, ~139dp box)', () => {
  const tile = imageTileSize({ breakpointSize: 150, available: 139 - reserve });
  assert.ok(tile < 150 && tile >= MIN_TILE_SIZE, `tile ${tile}`);
  assert.ok(tile + reserve <= 139, 'tile + border + padding overflows the box');
});

check('extra header (a 2-line question, audio button, safe area) shrinks it further, down to the floor', () => {
  const box = 139 - 60;
  assert.equal(imageTileSize({ breakpointSize: 150, available: box - reserve }), MIN_TILE_SIZE);
  assert.equal(imageTileSize({ breakpointSize: 150, available: -20 }), MIN_TILE_SIZE);
});

check('the ordering area reserves its 5px frame and padding above and below', () => {
  assert.equal(arrangeTileReserve(layouts), 5 + 2 * layouts.large);
});

check('no hard minHeight comes back on the answer box or tile area', () => {
  for (const f of [
    'screens/Practice/Components/MCQImage/PracticeMCQImage.tsx',
    'screens/Practice/Components/ArrangeImage/PracticeArrangeImage.tsx',
  ]) {
    assert.equal(/minHeight/.test(src(f)), false, `${f} has a minHeight`);
  }
});

check('the box height is measured, not guessed from the window', () => {
  for (const f of [
    'screens/Practice/Components/MCQImage/PracticeMCQImage.tsx',
    'screens/Practice/Components/ArrangeImage/PracticeArrangeImage.tsx',
  ]) {
    const s = src(f);
    assert.ok(s.includes('onLayout='), `${f} does not measure`);
    assert.equal(s.includes('useWindowDimensions'), false, `${f} uses the window height`);
  }
});

check('the tile size is derived from the measured height', () => {
  assert.ok(src('screens/Practice/Components/MCQImage/PracticeMCQImage.tsx').includes('available: boxHeight - choiceTileReserve('));
  assert.ok(src('screens/Practice/Components/ArrangeImage/PracticeArrangeImage.tsx').includes('available: areaHeight - arrangeTileReserve('));
});

check('PracticeMCQImage applies the row style and passes the size down', () => {
  const s = src('screens/Practice/Components/MCQImage/PracticeMCQImage.tsx');
  assert.ok(s.includes('contentContainerStyle={tileRowContentStyle('));
  assert.ok(s.includes('size={tileSize}'));
});

check('ordering tiles use the clamped size', () => {
  assert.ok(src('screens/Practice/Components/ArrangeImage/PracticeArrangeImage.tsx').includes('imageTileSize({'));
});

check('Practice and Quiz screens stay non-scrolling (list templates keep their bounded lists)', () => {
  for (const f of ['screens/Practice/PracticeScreen.tsx', 'screens/Quiz/QuizScreen.tsx']) {
    assert.equal(src(f).includes('useScroll'), false, `${f} must not wrap every template in a scroll view`);
  }
});

console.log(`\n${passed} passed`);
