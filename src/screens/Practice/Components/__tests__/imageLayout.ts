/**
 * Picture-choice layout rules that can be asserted without a browser:
 *  - the tile row grows past its box (flexGrow, never flex: 1) so it scrolls
 *    from the first tile instead of clipping it off the left edge;
 *  - the answer box has a floor at least one tile tall;
 *  - the tile size is clamped to the window height, so the question, the
 *    answer box and Submit fit a landscape phone without scrolling;
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
  QUESTION_CHROME_HEIGHT,
  answerAreaMinHeight,
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

// [width, height, breakpoint size the app picks for that width]
const SIZES: Array<[number, number, number]> = [
  [375, 812, 150],
  [812, 375, 150],
  [768, 1024, 150],
  [1280, 800, 175],
];
const reserve = 2 * layouts.divider + 2 * layouts.large;

check('tall screens keep the breakpoint tile size (375x812, 768x1024, 1280x800)', () => {
  for (const [w, h, bp] of SIZES.filter(([, h]) => h > 500)) {
    assert.equal(imageTileSize({ breakpointSize: bp, height: h, reserve }), bp, `${w}x${h}`);
  }
});

check('landscape phone (812x375) shrinks the tile so the box fits above Submit', () => {
  const [, h, bp] = SIZES[1];
  const tile = imageTileSize({ breakpointSize: bp, height: h, reserve });
  assert.ok(tile < bp && tile >= MIN_TILE_SIZE, `tile ${tile}`);
  assert.ok(
    QUESTION_CHROME_HEIGHT + answerAreaMinHeight(tile, layouts) <= h,
    'question chrome + answer box overflow the window',
  );
});

check('tile never drops below the floor, even on a very short window', () => {
  assert.equal(imageTileSize({ breakpointSize: 150, height: 200, reserve }), MIN_TILE_SIZE);
});

check('Practice and Quiz screens stay non-scrolling (list templates keep their bounded lists)', () => {
  for (const f of ['screens/Practice/PracticeScreen.tsx', 'screens/Quiz/QuizScreen.tsx']) {
    assert.equal(src(f).includes('useScroll'), false, `${f} must not wrap every template in a scroll view`);
  }
});

check('MCQ and ArrangeImage tiles use the clamped size', () => {
  assert.ok(src('components/practices/MCQImageItem.tsx').includes('imageTileSize({'));
  assert.ok(src('screens/Practice/Components/ArrangeImage/PracticeArrangeImage.tsx').includes('imageTileSize({'));
});

console.log(`\n${passed} passed`);
