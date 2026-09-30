/**
 * Corporate picture ordering (template 6), the parts that run in plain node:
 *  - the marks: a tick or a cross on every picture, consistent with the grade;
 *  - the tile state (answer shown, mark, drag) and Show answer's order;
 *  - the picture sizing at 375x812, 812x375, 768x1024 and 1280x800;
 *  - option media (a picture, or an audio file that leaves a placeholder);
 *  - the wiring, since a correct helper that nothing calls protects nobody.
 * The grading equivalence with the kids renderer is in `yarn test:answer`.
 *
 * Plain script run by `tsx` (package.json `test:image-ordering`).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '../../../../locales/en.json';
import km from '../../../../locales/km.json';
import {
  correctOrder,
  evaluateImageOrdering,
  optionMedia,
  optionsInOrder,
  pictureTileState,
  shuffleNotCorrect,
  SHUFFLE_TRIES,
} from '../ImageOrdering/imageOrderingLogic';
import {
  DESKTOP_IMAGE_HEIGHT,
  FOOTER_HEIGHT,
  MIN_IMAGE_HEIGHT,
  PHONE_IMAGE_HEIGHT,
  TILE_CHROME,
  imageOrderingLayout,
} from '../ImageOrdering/imageOrderingLayout';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}
const src = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

const opts = ['a', 'b', 'c', 'd'].map((id, i) => ({
  questionoptionid: id,
  questionoptionsequence: i + 1,
}));

// ---- marks ----------------------------------------------------------------
check('a correct order marks every picture correct, 4 of 4', () => {
  const e = evaluateImageOrdering(opts, ['a', 'b', 'c', 'd']);
  assert.equal(e.iscorrect, true);
  assert.deepEqual(e.perItem, { a: 'correct', b: 'correct', c: 'correct', d: 'correct' });
  assert.deepEqual(e.summary, { correctCount: 4, total: 4 });
});

check('two pictures swapped: those two are crossed, the others ticked, 2 of 4', () => {
  const e = evaluateImageOrdering(opts, ['a', 'c', 'b', 'd']);
  assert.equal(e.iscorrect, false);
  assert.deepEqual(e.perItem, { a: 'correct', c: 'incorrect', b: 'incorrect', d: 'correct' });
  assert.deepEqual(e.summary, { correctCount: 2, total: 4 });
});

check('a fully reversed order crosses every picture', () => {
  const e = evaluateImageOrdering(opts, ['d', 'c', 'b', 'a']);
  assert.equal(e.iscorrect, false);
  assert.equal(Object.values(e.perItem).every(m => m === 'incorrect'), true);
  assert.equal(e.summary?.correctCount, 0);
});

check('iscorrect is true exactly when every picture is ticked (all 24 orders)', () => {
  const perms = (xs: string[]): string[][] =>
    xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(r => [x, ...r]));
  for (const p of perms(['a', 'b', 'c', 'd'])) {
    const e = evaluateImageOrdering(opts, p);
    const allTicked = Object.values(e.perItem).every(m => m === 'correct');
    assert.equal(e.iscorrect, allTicked, p.join());
    assert.equal(e.summary?.correctCount, Object.values(e.perItem).filter(m => m === 'correct').length);
  }
});

check('equal sequences are interchangeable: swapping them stays correct', () => {
  const tied = [
    { questionoptionid: 'x', questionoptionsequence: 1 },
    { questionoptionid: 'y', questionoptionsequence: 2 },
    { questionoptionid: 'z', questionoptionsequence: 2 },
  ];
  for (const ids of [['x', 'y', 'z'], ['x', 'z', 'y']]) {
    const e = evaluateImageOrdering(tied, ids);
    assert.equal(e.iscorrect, true);
    assert.equal(e.summary?.correctCount, 3);
  }
});

check('the answer sent is the ids in the learner order', () => {
  assert.deepEqual(evaluateImageOrdering(opts, ['b', 'a', 'c', 'd']).answer, {
    v: 1,
    type: 'order',
    order: ['b', 'a', 'c', 'd'],
  });
});

// ---- order helpers and tile state -----------------------------------------
check('correctOrder sorts by sequence and does not touch its input', () => {
  const shuffled = [opts[2], opts[0], opts[3], opts[1]];
  const copy = [...shuffled];
  assert.deepEqual(correctOrder(shuffled).map(o => o.questionoptionid), ['a', 'b', 'c', 'd']);
  assert.deepEqual(shuffled, copy);
});

check('optionsInOrder follows the ids and skips unknown ones', () => {
  assert.deepEqual(optionsInOrder(opts, ['c', 'zzz', 'a']).map(o => o.questionoptionid), ['c', 'a']);
});

check('tile state: answer shown beats marks beats drag beats pick', () => {
  const marks = { a: 'incorrect', b: 'correct' } as const;
  const base = { picked: false, lifted: false };
  assert.equal(pictureTileState('a', { ...base, marks, showAnswer: true }), 'correct');
  assert.equal(pictureTileState('a', { ...base, marks, showAnswer: false }), 'incorrect');
  assert.equal(pictureTileState('b', { ...base, marks, showAnswer: false }), 'correct');
  assert.equal(pictureTileState('c', { ...base, marks, showAnswer: false }), 'default');
  assert.equal(pictureTileState('a', { picked: true, lifted: false, marks: null, showAnswer: false }), 'picked');
  assert.equal(pictureTileState('a', { picked: true, lifted: true, marks: null, showAnswer: false }), 'dragging');
  assert.equal(pictureTileState('a', { ...base, marks: null, showAnswer: false }), 'default');
});

// ---- the starting shuffle ---------------------------------------------------
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
check('2, 3, 4 and 6 pictures never start correct, across 3000 seeds', () => {
  for (const n of [2, 3, 4, 6]) {
    const set = Array.from({ length: n }, (_, i) => ({ questionoptionid: `p${i}`, questionoptionsequence: i + 1 }));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 3000; seed++) {
      const order = shuffleNotCorrect(set, seeded(seed));
      assert.equal(order.length, n);
      assert.equal(evaluateImageOrdering(set, order.map(o => o.questionoptionid)).iscorrect, false, `n=${n} seed=${seed}`);
      seen.add(order.map(o => o.questionoptionid).join());
    }
    assert.ok(n === 2 ? seen.size === 1 : seen.size > 1, 'varies when it can');
  }
});
check('a run of unlucky draws is retried, not accepted', () => {
  const set = [1, 2, 3].map(i => ({ questionoptionid: `p${i}`, questionoptionsequence: i }));
  // rng of 0.99 never swaps in the first pass, so the first shuffle is the identity (correct)
  let calls = 0;
  const rng = () => (calls++ < 2 ? 0.99 : 0);
  const order = shuffleNotCorrect(set, rng);
  assert.equal(evaluateImageOrdering(set, order.map(o => o.questionoptionid)).iscorrect, false);
});
check('when no order is wrong (all sequences equal, or one picture) it still ends', () => {
  const same = [1, 2, 3].map(i => ({ questionoptionid: `s${i}`, questionoptionsequence: 5 }));
  let calls = 0;
  const order = shuffleNotCorrect(same, () => {
    if (++calls > 10_000) throw new Error('shuffle does not end');
    return 0.5;
  });
  assert.equal(order.length, 3);
  assert.ok(calls <= SHUFFLE_TRIES * same.length, `calls ${calls}`);
  assert.equal(shuffleNotCorrect([same[0]]).length, 1);
  assert.equal(shuffleNotCorrect([]).length, 0);
});
check('the body starts each attempt from shuffleNotCorrect', () => {
  const s = src('ImageOrdering/ImageOrderingBody.tsx');
  assert.match(s, /shuffleNotCorrect\(questionOptions\)/);
  assert.doesNotMatch(s, /_\.shuffle\(/);
});

// ---- option media ----------------------------------------------------------
check('option media: a picture, an audio file (placeholder picture), or nothing', () => {
  assert.deepEqual(optionMedia({ questionoptionfile: { filename: 'a.png', filetype: 6 } }), { imageName: 'a.png', audioName: '' });
  assert.deepEqual(optionMedia({ questionoptionfile: { filename: 'a.mp3', filetype: 1 } }), { imageName: '', audioName: 'a.mp3' });
  assert.deepEqual(optionMedia({ questionoptionfile: { filename: 'a.MP3' } }), { imageName: '', audioName: 'a.MP3' });
  assert.deepEqual(optionMedia({ questionoptionfile: { filename: 'a.jpg' } }), { imageName: 'a.jpg', audioName: '' });
  assert.deepEqual(optionMedia({ questionoptionfile: { filename: '' } }), { imageName: '', audioName: '' });
  assert.deepEqual(optionMedia({}), { imageName: '', audioName: '' });
});

// ---- picture sizing --------------------------------------------------------
// gridTop is where the grid starts in the window: about 236 on a phone (the
// question card and the instruction line above it), 190 in landscape.
const at = (w: number, h: number, gridTop: number | null, count: number, tabBar = 0) =>
  imageOrderingLayout({ containerWidth: w, windowHeight: h, gridTop, tabBarHeight: tabBar, count });

check('375x812: 2 across, four pictures (two rows) fit at the design height', () => {
  const l = at(335, 812, 236, 4);
  assert.equal(l.columns, 2);
  assert.equal(l.gap, 12);
  assert.equal(l.tileWidth, 161);
  assert.equal(l.imageHeight, PHONE_IMAGE_HEIGHT);
});

check('375x812: six pictures (three rows) shrink just enough to fit above the footer', () => {
  const l = at(335, 812, 236, 6);
  assert.equal(l.imageHeight, 91);
  const rows = 3;
  const used = 236 + rows * (l.imageHeight + TILE_CHROME) + (rows - 1) * l.gap + FOOTER_HEIGHT;
  assert.ok(used <= 812 && used > 812 - rows, `used ${used}`);
  // With a tab bar under the footer they shrink further, never past the floor.
  const withBar = at(335, 812, 236, 6, 80);
  assert.ok(withBar.imageHeight < l.imageHeight && withBar.imageHeight >= MIN_IMAGE_HEIGHT);
});

check('812x375: landscape phone, 4 across, six pictures: the smallest legible picture', () => {
  const l = at(760, 375, 190, 6);
  assert.equal(l.columns, 4);
  assert.equal(l.gap, 16);
  assert.equal(l.tileWidth, 178);
  assert.equal(l.imageHeight, MIN_IMAGE_HEIGHT);
});

check('812x375: not even one row fits above the footer, so four pictures also get the floor (the page scrolls)', () => {
  assert.equal(at(760, 375, 190, 4).imageHeight, MIN_IMAGE_HEIGHT);
});

check('a window tall enough for one row but not two: four pictures are bigger than six', () => {
  const four = at(760, 520, 190, 4);
  const six = at(760, 520, 190, 6);
  assert.equal(four.imageHeight, DESKTOP_IMAGE_HEIGHT);
  assert.equal(six.imageHeight, MIN_IMAGE_HEIGHT);
  assert.ok(190 + four.imageHeight + TILE_CHROME + FOOTER_HEIGHT <= 520);
});

check('768x1024: tablet, 4 across at the design height', () => {
  const l = at(728, 1024, 260, 6);
  assert.equal(l.columns, 4);
  assert.equal(l.imageHeight, DESKTOP_IMAGE_HEIGHT);
});

check('1280x800: desktop, the 760 column, 4 across at the design height', () => {
  const l = at(760, 800, 260, 6);
  assert.equal(l.columns, 4);
  assert.equal(l.tileWidth, 178);
  assert.equal(l.imageHeight, DESKTOP_IMAGE_HEIGHT);
});

check('never below the floor and never above the design height, whatever the window', () => {
  for (const h of [100, 300, 375, 600, 812, 1024, 4000]) {
    for (const w of [335, 728, 760]) {
      for (const count of [1, 3, 4, 6, 8]) {
        const l = at(w, h, 200, count);
        assert.ok(l.imageHeight >= MIN_IMAGE_HEIGHT, `${w}x${h} n=${count}`);
        assert.ok(l.imageHeight <= (l.columns === 4 ? DESKTOP_IMAGE_HEIGHT : PHONE_IMAGE_HEIGHT));
      }
    }
  }
});

check('before anything is measured: the design height, no crash', () => {
  const l = at(0, 812, null, 6);
  assert.equal(l.tileWidth, 0);
  assert.equal(l.imageHeight, PHONE_IMAGE_HEIGHT);
  assert.equal(at(335, 0, 236, 6).imageHeight, PHONE_IMAGE_HEIGHT);
});

// ---- wiring and strings ----------------------------------------------------
check('the renderer is the shell with the body, and no longer today\'s renderer', () => {
  const s = src('ImageOrdering.tsx');
  assert.match(s, /<CorporateQuestionShell[^>]*Body=\{ImageOrderingBody\}/);
  assert.doesNotMatch(s, /PracticeArrangeImage/);
});

check('the body reports always-ready with the shared grade, and uses the sizing helper and the kit', () => {
  const s = src('ImageOrdering/ImageOrderingBody.tsx');
  assert.match(s, /useReportAnswer\(report, true, \(\) => evaluateImageOrdering\(/);
  assert.match(s, /imageOrderingLayout\(/);
  assert.match(s, /layout="grid"/);
  assert.match(s, /renderAccessory=/);
  assert.match(s, /badge=\{position\}/);
  assert.match(s, /correctOrder\(questionOptions\)/);
  // The picture is not a mouse target: an <img> under the pointer starts the
  // browser's own image drag on the web and cancels the list's drag.
  assert.match(s, /<View pointerEvents="none">\s*<MovableTile/);
});

check('the kids renderer grades through the shared function too', () => {
  const s = readFileSync(join(__dirname, '..', '..', 'Components', 'ArrangeImage', 'PracticeArrangeImage.tsx'), 'utf8');
  assert.match(s, /gradeArrangeImage\(options\)/);
});

check('the corporate.imageOrdering strings exist in both locales, Khmer in Khmer, same placeholders', () => {
  const e = (en as any).corporate.imageOrdering;
  const k = (km as any).corporate.imageOrdering;
  assert.deepEqual(Object.keys(k).sort(), Object.keys(e).sort());
  const holes = (x: string) => (x.match(/\{\{\w+\}\}/g) ?? []).sort();
  for (const key of Object.keys(e)) {
    assert.ok(/[ក-៿]/.test(k[key]), key);
    assert.deepEqual(holes(k[key]), holes(e[key]), key);
  }
  const used = [...src('ImageOrdering/ImageOrderingBody.tsx').matchAll(/'(corporate\.imageOrdering\.\w+)'/g)].map(m => m[1]);
  assert.ok(used.length >= 2);
  for (const u of used) assert.ok(e[u.split('.')[2]], u);
});

console.log(`imageOrdering: ${passed} checks passed`);
