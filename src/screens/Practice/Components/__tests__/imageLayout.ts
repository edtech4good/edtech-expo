/**
 * Picture-choice layout rules that can be asserted without a browser:
 *  - the tile row grows past its box (flexGrow, never flex: 1) so it scrolls
 *    from the first tile instead of clipping it off the left edge;
 *  - the answer box has a floor at least one tile tall;
 *  - the screens actually apply those rules (wiring), since a correct helper
 *    that nothing calls protects nobody.
 *
 * Plain script run by `tsx` (package.json `test:layout`). The pixel-level
 * behaviour (first tile visible at 375 wide, Submit reachable at 812x375)
 * was checked in a real browser; see the PR.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  answerAreaMinHeight,
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

check('answer box floor fits one tile plus its border, at every tile size', () => {
  // MCQImageItem tile sizes by breakpoint: mobile/phablet 150, tablet 175, desktop 256.
  for (const tile of [150, 175, 256]) {
    const min = answerAreaMinHeight(tile, layouts);
    assert.ok(
      min >= tile + 2 * layouts.divider,
      `${min} does not fit a ${tile}px tile and its border`,
    );
    assert.ok(min > tile + 2 * layouts.divider, 'no room above/below the tile');
  }
});

check('PracticeMCQImage applies both rules', () => {
  const s = src('screens/Practice/Components/MCQImage/PracticeMCQImage.tsx');
  assert.ok(s.includes('contentContainerStyle={tileRowContentStyle('));
  assert.ok(s.includes('minHeight: answerAreaHeight'));
  assert.ok(s.includes('answerAreaMinHeight(tileSize'));
});

check('Practice and Quiz screens scroll when content is taller than the screen', () => {
  for (const f of ['screens/Practice/PracticeScreen.tsx', 'screens/Quiz/QuizScreen.tsx']) {
    assert.ok(src(f).includes('<LayoutScrollView useScroll'), `${f} does not scroll`);
  }
});

check('ArrangeImage tile area never shrinks below its wrapped tiles', () => {
  const s = src('screens/Practice/Components/ArrangeImage/PracticeArrangeImage.tsx');
  assert.ok(s.includes("flexShrink: 0, flexBasis: 'auto'"));
  assert.equal((s.match(/NO_SHRINK/g) ?? []).length >= 3, true);
});

console.log(`\n${passed} passed`);
