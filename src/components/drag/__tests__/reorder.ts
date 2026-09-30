/**
 * The drag primitive's pure logic (src/components/drag/reorder.ts): reorder
 * maths, the insertion gap for a pointer over measured tile rects, the caret
 * position, the screen-reader and keyboard moves, and tap-to-swap.
 *
 * Plain script run by `tsx` (package.json `test:drag`), like the other
 * suites. Exits non-zero on the first failed check. The gesture and
 * rendering behaviour was checked on Expo web and the Android emulator; see
 * the PR.
 */
import assert from 'node:assert/strict';
import {
  applyTap,
  availableMoveActions,
  caretRect,
  describeGap,
  gridColumns,
  gridItemWidth,
  insertionGap,
  insertionTarget,
  isNoopGap,
  itemAccessibilityLabel,
  keyboardAction,
  moveActionTarget,
  moveAnnouncement,
  moveItem,
  Rect,
  swapItems,
  targetIndexForGap,
} from '../reorder';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
  passed += 1;
  console.log(`ok  ${name}`);
}

// ---------------------------------------------------------------------------
// Fixtures: rects as a wrapping inline row lays them out. Six word tiles,
// 48 high, 10 across and 12 down between tiles, in a 330-wide container:
//
//   line 1 (y 0):   sale[0..70]  in[80..128]  Write[138..222]
//   line 2 (y 60):  book[0..80]  every[90..180]  your[190..266]
const r = (x: number, y: number, width: number, height = 48): Rect => ({ x, y, width, height });
const WORDS = ['sale', 'in', 'Write', 'book', 'every', 'your'];
const ROW: Rect[] = [
  r(0, 0, 70),
  r(80, 0, 48),
  r(138, 0, 84),
  r(0, 60, 80),
  r(90, 60, 90),
  r(190, 60, 76),
];
// A 2-across grid of four 160x170 cards, 12 apart.
const GRID: Rect[] = [r(0, 0, 160, 170), r(172, 0, 160, 170), r(0, 182, 160, 170), r(172, 182, 160, 170)];

// ---------------------------------------------------------------------------
check('moveItem moves forward and backward, and copies', () => {
  const a = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveItem(a, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(a, 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveItem(a, 1, 1), a);
  assert.notEqual(moveItem(a, 1, 1), a, 'returns a copy');
  assert.deepEqual(a, ['a', 'b', 'c', 'd'], 'input untouched');
});

check('moveItem clamps the target and ignores a bad source', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 99), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, -5), ['c', 'a', 'b']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 7, 0), ['a', 'b', 'c']);
});

check('swapItems swaps two and leaves the rest', () => {
  assert.deepEqual(swapItems(['a', 'b', 'c', 'd'], 0, 3), ['d', 'b', 'c', 'a']);
  assert.deepEqual(swapItems(['a', 'b'], 1, 1), ['a', 'b']);
  assert.deepEqual(swapItems(['a', 'b'], 0, 5), ['a', 'b']);
});

check('gap to target index: later gaps shift down by one', () => {
  // Dragging index 2 ("Write") to gap 0 (before "sale") lands at 0.
  assert.equal(targetIndexForGap(2, 0), 0);
  // Dragging index 0 to gap 4 (before "every") lands at 3.
  assert.equal(targetIndexForGap(0, 4), 3);
  // To the very end.
  assert.equal(targetIndexForGap(0, 6), 5);
  // Both gaps beside the item leave it where it is.
  assert.equal(targetIndexForGap(2, 2), 2);
  assert.equal(targetIndexForGap(2, 3), 2);
  assert.equal(isNoopGap(2, 2), true);
  assert.equal(isNoopGap(2, 3), true);
  assert.equal(isNoopGap(2, 1), false);
  assert.equal(isNoopGap(2, 4), false);
});

check('the mockup drop: Write before sale gives Write sale in book every your', () => {
  const gap = insertionGap({ x: 5, y: 24 }, ROW);
  assert.equal(gap, 0);
  const next = moveItem(WORDS, 2, targetIndexForGap(2, gap));
  assert.deepEqual(next, ['Write', 'sale', 'in', 'book', 'every', 'your']);
});

check('insertion gap: left and right halves of a tile', () => {
  // "in" spans 80..128, centre 104.
  assert.equal(insertionGap({ x: 100, y: 20 }, ROW), 1);
  assert.equal(insertionGap({ x: 110, y: 20 }, ROW), 2);
  // In the 10pt space between "sale" and "in".
  assert.equal(insertionGap({ x: 75, y: 20 }, ROW), 1);
});

check('insertion gap: past the end of a line is that line, not the next', () => {
  const t = insertionTarget({ x: 300, y: 20 }, ROW);
  assert.deepEqual(t, { gap: 3, atLineEnd: true });
  // The same gap from the start of line 2 is not "at line end".
  assert.deepEqual(insertionTarget({ x: 2, y: 80 }, ROW), { gap: 3, atLineEnd: false });
});

check('insertion gap: end of the list', () => {
  assert.deepEqual(insertionTarget({ x: 320, y: 84 }, ROW), { gap: 6, atLineEnd: true });
});

check('insertion gap: pointer above, below and between lines snaps to the nearest line', () => {
  assert.equal(insertionGap({ x: 150, y: -40 }, ROW), 2, 'above line 1');
  assert.equal(insertionGap({ x: 150, y: 400 }, ROW), 5, 'below line 2');
  // y 50 is 2 below line 1 (0..48) and 10 above line 2 (60..108).
  assert.equal(insertionGap({ x: 150, y: 50 }, ROW), 2, 'between, nearer line 1');
  assert.equal(insertionGap({ x: 150, y: 58 }, ROW), 5, 'between, nearer line 2');
});

check('insertion gap: tiles of different heights on one line (Khmer) are one line', () => {
  const km: Rect[] = [r(0, 0, 60, 52), r(70, 2, 90, 48), r(0, 64, 80, 52)];
  assert.equal(insertionGap({ x: 150, y: 10 }, km), 2);
  assert.deepEqual(insertionTarget({ x: 200, y: 10 }, km), { gap: 2, atLineEnd: true });
});

check('insertion gap: grid rows', () => {
  assert.equal(insertionGap({ x: 10, y: 10 }, GRID), 0);
  assert.equal(insertionGap({ x: 250, y: 10 }, GRID), 1);
  assert.equal(insertionGap({ x: 320, y: 10 }, GRID), 2);
  assert.equal(insertionGap({ x: 10, y: 300 }, GRID), 2);
  assert.equal(insertionGap({ x: 330, y: 300 }, GRID), 4);
});

check('insertion gap: no rects', () => {
  assert.equal(insertionGap({ x: 0, y: 0 }, []), -1);
});

check('caret: before a tile, centred in the gap', () => {
  const c = caretRect({ gap: 1, atLineEnd: false }, ROW, 10, 4);
  assert.deepEqual(c, { x: 80 - 5 - 2, y: 0, width: 4, height: 48 });
  const first = caretRect({ gap: 0, atLineEnd: false }, ROW, 10, 4);
  assert.deepEqual(first, { x: -7, y: 0, width: 4, height: 48 });
});

check('caret: at a line end it sits after the last tile of that line', () => {
  const c = caretRect({ gap: 3, atLineEnd: true }, ROW, 10, 4);
  assert.deepEqual(c, { x: 222 + 5 - 2, y: 0, width: 4, height: 48 });
  // The same gap not at a line end is drawn at the start of line 2.
  const d = caretRect({ gap: 3, atLineEnd: false }, ROW, 10, 4);
  assert.deepEqual(d, { x: -7, y: 60, width: 4, height: 48 });
  const end = caretRect({ gap: 6, atLineEnd: true }, ROW, 10, 4);
  assert.deepEqual(end, { x: 266 + 5 - 2, y: 60, width: 4, height: 48 });
});

check('caret: clamped inside the container at a line start or a full line end', () => {
  // Unclamped, gap 0 would sit at x -7, outside the list.
  assert.deepEqual(caretRect({ gap: 0, atLineEnd: false }, ROW, 10, 4, 330), { x: 0, y: 0, width: 4, height: 48 });
  assert.deepEqual(caretRect({ gap: 3, atLineEnd: false }, ROW, 10, 4, 330), { x: 0, y: 60, width: 4, height: 48 });
  // A line that fills the width: the end caret is pulled back inside.
  assert.deepEqual(caretRect({ gap: 3, atLineEnd: true }, ROW, 10, 4, 224), { x: 220, y: 0, width: 4, height: 48 });
  // Inside the gaps nothing moves.
  assert.deepEqual(caretRect({ gap: 1, atLineEnd: false }, ROW, 10, 4, 330), { x: 73, y: 0, width: 4, height: 48 });
});

check('caret: invalid gaps draw nothing', () => {
  assert.equal(caretRect({ gap: -1, atLineEnd: false }, ROW, 10, 4), null);
  assert.equal(caretRect({ gap: 7, atLineEnd: false }, ROW, 10, 4), null);
  assert.equal(caretRect({ gap: 0, atLineEnd: false }, [], 10, 4), null);
});

check('grid: 2 across on phone, 4 from 600 wide', () => {
  assert.equal(gridColumns(350), 2);
  assert.equal(gridColumns(599), 2);
  assert.equal(gridColumns(600), 4);
  assert.equal(gridColumns(720), 4);
  assert.equal(gridItemWidth(350, 2, 12), 169);
  assert.equal(gridItemWidth(720, 4, 16), 168);
  assert.equal(gridItemWidth(0, 2, 12), 0);
});

check('screen-reader actions: index changes', () => {
  assert.equal(moveActionTarget('moveEarlier', 2, 6), 1);
  assert.equal(moveActionTarget('moveLater', 2, 6), 3);
  assert.equal(moveActionTarget('moveToStart', 2, 6), 0);
  assert.equal(moveActionTarget('moveToEnd', 2, 6), 5);
  assert.equal(moveActionTarget('moveEarlier', 0, 6), null);
  assert.equal(moveActionTarget('moveToStart', 0, 6), null);
  assert.equal(moveActionTarget('moveLater', 5, 6), null);
  assert.equal(moveActionTarget('moveToEnd', 5, 6), null);
  assert.equal(moveActionTarget('moveLater', 9, 6), null);
});

check('screen-reader actions: only the ones that do something are offered', () => {
  assert.deepEqual(availableMoveActions(0, 6), ['moveLater', 'moveToEnd']);
  assert.deepEqual(availableMoveActions(5, 6), ['moveEarlier', 'moveToStart']);
  assert.deepEqual(availableMoveActions(2, 6), ['moveEarlier', 'moveLater', 'moveToStart', 'moveToEnd']);
  assert.deepEqual(availableMoveActions(0, 1), []);
});

check('screen-reader action applied: Write to start', () => {
  const to = moveActionTarget('moveToStart', 2, WORDS.length);
  assert.deepEqual(moveItem(WORDS, 2, to as number), ['Write', 'sale', 'in', 'book', 'every', 'your']);
});

check('keyboard: Enter/Space tap, arrows move only while picked', () => {
  assert.deepEqual(keyboardAction('Enter', 2, 6, false, 1), { kind: 'tap' });
  assert.deepEqual(keyboardAction(' ', 2, 6, true, 1), { kind: 'tap' });
  assert.deepEqual(keyboardAction('ArrowLeft', 2, 6, false, 1), { kind: 'none' });
  assert.deepEqual(keyboardAction('ArrowLeft', 2, 6, true, 1), { kind: 'move', to: 1 });
  assert.deepEqual(keyboardAction('ArrowRight', 2, 6, true, 1), { kind: 'move', to: 3 });
  assert.deepEqual(keyboardAction('Home', 2, 6, true, 1), { kind: 'move', to: 0 });
  assert.deepEqual(keyboardAction('End', 2, 6, true, 1), { kind: 'move', to: 5 });
  assert.deepEqual(keyboardAction('ArrowLeft', 0, 6, true, 1), { kind: 'none' });
  assert.deepEqual(keyboardAction('Escape', 2, 6, true, 1), { kind: 'cancel' });
  assert.deepEqual(keyboardAction('a', 2, 6, true, 1), { kind: 'none' });
});

check('keyboard: Up and Down move a whole row in a grid', () => {
  assert.deepEqual(keyboardAction('ArrowDown', 1, 6, true, 2), { kind: 'move', to: 3 });
  assert.deepEqual(keyboardAction('ArrowUp', 3, 6, true, 2), { kind: 'move', to: 1 });
  assert.deepEqual(keyboardAction('ArrowDown', 5, 6, true, 2), { kind: 'none' });
  assert.deepEqual(keyboardAction('ArrowDown', 4, 6, true, 2), { kind: 'move', to: 5 });
});

check('tap to swap: pick, swap, cancel', () => {
  const a = applyTap(WORDS, null, 'Write');
  assert.equal(a.event, 'picked');
  assert.equal(a.picked, 'Write');
  assert.deepEqual(a.order, WORDS);
  const b = applyTap(WORDS, 'Write', 'sale');
  assert.equal(b.event, 'swapped');
  assert.equal(b.picked, null);
  assert.deepEqual(b.order, ['Write', 'in', 'sale', 'book', 'every', 'your']);
  const c = applyTap(WORDS, 'Write', 'Write');
  assert.equal(c.event, 'cancelled');
  assert.equal(c.picked, null);
  assert.deepEqual(c.order, WORDS);
  // A stale pick (the item is gone) starts a fresh pick.
  assert.equal(applyTap(WORDS, 'gone', 'in').event, 'picked');
});

check('labels and announcements', () => {
  assert.equal(itemAccessibilityLabel('Write', 'Word', 2, 6), 'Write. Word 3 of 6');
  assert.equal(
    moveAnnouncement('Write', 'Word', 0, ['Write', 'sale', 'in', 'book', 'every', 'your']),
    'Write moved to word 1. Write sale in book every your.',
  );
  assert.equal(describeGap(2, 0, WORDS), 'before “sale”');
  assert.equal(describeGap(0, 6, WORDS), 'after “your”');
  assert.equal(describeGap(2, 3, WORDS), null);
});

check('Khmer labels pass through unchanged', () => {
  const km = 'ការលក់';
  assert.equal(itemAccessibilityLabel(km, 'Word', 0, 7), `${km}. Word 1 of 7`);
  assert.equal(describeGap(3, 2, ['ខ្ញុំ', 'កត់ត្រា', km, 'ទាំងអស់']), `before “${km}”`);
});

console.log(`\n${passed} checks passed`);
