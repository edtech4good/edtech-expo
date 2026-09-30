/**
 * Corporate multiple choice, pictures (templates 2 and 4):
 *  - selection: template 2 is single-select in corporate (with the
 *    multi-correct fallback), template 4 multi; roles follow;
 *  - grading: for the same final selection the corporate path sends the same
 *    `iscorrect` and answerV1 as today's PracticeMCQImage, and the server's
 *    rules grade that answer the way the device did. Multi (template 4):
 *    every tap sequence, un-taps included, over 2 to 4 options;
 *  - selection state, `checked` and the option's look after a result and
 *    Show answer;
 *  - the tile sizing from the shell's measured layout (regular and compact);
 *  - which file is an option's picture and which its audio, and the
 *    accessible name of an option with no text.
 *
 * Plain script run by `tsx` (package.json `test:mcqimage`).
 */
import assert from 'node:assert/strict';
import _ from 'lodash';
import { choiceAnswer } from '../../../../../utils/answerV1';
import { INITIAL_SHELL_STATE, shellPress } from '../../shellLogic';
import {
  CARD_CAPTION,
  CARD_FRAME,
  COMPACT_CARD_FRAME,
  COMPACT_GRID_GAP,
  COMPACT_MIN_TILE,
  GRID_GAP,
  REGULAR_MIN_TILE,
  evaluateMcqImage,
  imageOptionState,
  indicatorKind,
  isChecked,
  optionAccessibleName,
  optionLetter,
  optionMediaNames,
  planHeight,
  planImageGrid,
  planWidth,
  selectOption,
  selectionModeFor,
  selectionRoles,
  toggleSelection,
} from '../imageChoiceLogic';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

interface Opt {
  questionoptionid: string;
  questionoptioniscorrect: boolean;
}
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const q = (options: Opt[]) => ({ questionobject: { questionoptions: options } });
const mk = (n: number, correct: boolean): Opt => ({ questionoptionid: U(n), questionoptioniscorrect: correct });

// Fixtures: 2, 3 and 4 options; template 2 has one right answer, template 4 several.
const SINGLE: Record<number, Opt[]> = {
  2: [mk(1, true), mk(2, false)],
  3: [mk(1, false), mk(2, true), mk(3, false)],
  4: [mk(1, false), mk(2, false), mk(3, true), mk(4, false)],
};
const MULTI: Record<number, Opt[]> = {
  2: [mk(1, true), mk(2, true)],
  3: [mk(1, true), mk(2, false), mk(3, true)],
  4: [mk(1, true), mk(2, false), mk(3, true), mk(4, false)],
};

/** PracticeMCQImage.handleSubmit's grade and answer, verbatim (the kids renderer). */
function kidsSubmit(questionOptions: Opt[], selections: Record<string, unknown>) {
  const { isCorrect } = _.reduce(
    questionOptions,
    (result, value) => {
      if (value.questionoptioniscorrect && _.isEmpty(selections[value.questionoptionid]))
        result.isCorrect = false;
      else if (!value.questionoptioniscorrect && !_.isEmpty(selections[value.questionoptionid]))
        result.isCorrect = false;
      return result;
    },
    { isCorrect: true },
  );
  return { isCorrect, answer: choiceAnswer(_.keys(_.pickBy(selections, v => !_.isEmpty(v)))) };
}
/** PracticeMCQImage.handleItemPress, verbatim (it mutates on un-select). */
function kidsSelections(taps: Opt[]) {
  let selections: Record<string, Opt> = {};
  for (const qp of taps) {
    if (!_.isEmpty(selections[qp.questionoptionid])) {
      const old = selections;
      delete old[qp.questionoptionid];
      selections = old;
    } else selections = { ...selections, [qp.questionoptionid]: qp };
  }
  return selections;
}
function corporateSelections(taps: Opt[], mode: 'single' | 'multi' = 'multi') {
  let selections: Record<string, Opt> = {};
  for (const qp of taps) selections = selectOption(selections, qp.questionoptionid, qp, mode);
  return selections;
}

/** Mirrors gradeChoice (the student API's grading/templates.ts). */
function serverGradeChoice(options: Opt[], selected: string[]): boolean {
  const correct = new Set(options.filter(o => o.questionoptioniscorrect).map(o => o.questionoptionid));
  const sel = new Set(selected);
  if (sel.size !== selected.length) return false;
  if (sel.size !== correct.size) return false;
  for (const id of sel) if (!correct.has(id)) return false;
  return true;
}

/** Every tap word (an option index per tap, un-taps included) up to `maxLen`. */
function* tapWords(options: Opt[], maxLen: number): Generator<Opt[]> {
  function* walk(prefix: Opt[]): Generator<Opt[]> {
    yield prefix;
    if (prefix.length === maxLen) return;
    for (const o of options) yield* walk([...prefix, o]);
  }
  yield* walk([]);
}

function assertSendsWhatKidsSend(templateId: number, options: Opt[], cSel: Record<string, Opt>) {
  const kids = kidsSubmit(options, cSel);
  const corp = evaluateMcqImage(options, cSel);
  assert.equal(corp.iscorrect, kids.isCorrect);
  assert.deepEqual(corp.answer, kids.answer);
  assert.equal(serverGradeChoice(options, (corp.answer as { selected: string[] }).selected), corp.iscorrect);
  assert.ok(templateId === 2 || templateId === 4);
  // What the shell sends the screen (practice and quiz) is that answer.
  for (const mode of ['practice', 'quiz'] as const) {
    const r = shellPress({ ...INITIAL_SHELL_STATE, tries: 2 }, 'submit', {
      mode,
      ready: true,
      evaluate: () => corp,
    });
    assert.equal(r.effect.kind, 'submit');
    if (r.effect.kind === 'submit') {
      assert.equal(r.effect.iscorrect, kids.isCorrect);
      assert.deepEqual(r.effect.answer, kids.answer);
    }
  }
}

// Template 4 (multi): every tap sequence, un-taps included, is the kids path.
for (const n of [2, 3, 4]) {
  check(`template 4, ${n} options: every tap sequence (un-taps included) selects, grades and sends what the kids renderer does`, () => {
    const options = MULTI[n];
    let count = 0;
    let untaps = 0;
    for (const taps of tapWords(options, n === 4 ? 6 : 7)) {
      const kSel = kidsSelections(taps);
      const cSel = corporateSelections(taps, selectionModeFor(4, q(options)));
      assert.deepEqual(Object.keys(cSel), Object.keys(kSel), 'same selection, same order');
      assertSendsWhatKidsSend(4, options, cSel);
      if (taps.length > new Set(taps.map(t => t.questionoptionid)).size) untaps++;
      count++;
    }
    assert.ok(count > 50, `tried ${count} sequences`);
    assert.ok(untaps > 0, 'some sequences un-tap');
  });
}

// Template 2 (single-select): the final selection is the last option tapped,
// and for that final selection corporate = kids = server. (Kids would hold
// several after the same taps; the comparison is on the final selection.)
for (const n of [2, 3, 4]) {
  check(`template 2, ${n} options: every tap sequence ends on the last option tapped, and that selection grades and sends what the kids path does`, () => {
    const options = SINGLE[n];
    const mode = selectionModeFor(2, q(options));
    assert.equal(mode, 'single');
    let count = 0;
    for (const taps of tapWords(options, n === 4 ? 6 : 7)) {
      const cSel = corporateSelections(taps, mode);
      const last = taps[taps.length - 1];
      assert.deepEqual(Object.keys(cSel), last ? [last.questionoptionid] : []);
      assertSendsWhatKidsSend(2, options, cSel);
      // The same final choice made in one tap on the kids renderer.
      if (last) assert.deepEqual(kidsSubmit(options, kidsSelections([last])), kidsSubmit(options, cSel));
      count++;
    }
    assert.ok(count > 50);
  });
}

check('an empty answer is sent as no selection and graded wrong, as today', () => {
  const r = evaluateMcqImage(SINGLE[4], {});
  assert.equal(r.iscorrect, false);
  assert.deepEqual(r.answer, kidsSubmit(SINGLE[4], {}).answer);
});

check('multi: selection order is the order tapped; un-select then re-select moves it last', () => {
  const o = MULTI[4];
  const s = corporateSelections([o[2], o[0], o[2], o[2]], 'multi');
  assert.deepEqual(Object.keys(s), [U(1), U(3)]);
  assert.deepEqual(Object.keys(corporateSelections([o[0]], 'multi')), [U(1)]);
  assert.deepEqual(Object.keys(corporateSelections([o[0], o[0]], 'multi')), []);
});

check('single: a tap replaces the choice, tapping the chosen one keeps it (a radio does not unselect)', () => {
  const o = SINGLE[3];
  assert.deepEqual(Object.keys(corporateSelections([o[0], o[1]], 'single')), [U(2)]);
  assert.deepEqual(Object.keys(corporateSelections([o[1], o[1]], 'single')), [U(2)]);
  assert.deepEqual(Object.keys(corporateSelections([o[0], o[1], o[0]], 'single')), [U(1)]);
});

check('mode: template 2 single, 4 multi; a template 2 question with two correct options falls back to multi', () => {
  assert.equal(selectionModeFor(2, q(SINGLE[4])), 'single');
  assert.equal(selectionModeFor(4, q(MULTI[4])), 'multi');
  assert.equal(selectionModeFor(4, q(SINGLE[4])), 'multi');
  assert.equal(selectionModeFor(2, q(MULTI[4])), 'multi', 'multi-correct falls back so it stays answerable');
  // ...and there the learner can choose both correct options and grade right.
  const m = MULTI[4];
  const sel = corporateSelections([m[0], m[2]], selectionModeFor(2, q(m)));
  assert.equal(evaluateMcqImage(m, sel).iscorrect, true);
});

check('roles: single is a radiogroup of radios, multi a group of checkboxes', () => {
  assert.deepEqual(selectionRoles('single'), { group: 'radiogroup', option: 'radio' });
  assert.deepEqual(selectionRoles('multi'), { group: 'group', option: 'checkbox' });
  assert.deepEqual(selectionRoles(selectionModeFor(2, q(SINGLE[3]))), { group: 'radiogroup', option: 'radio' });
  assert.deepEqual(selectionRoles(selectionModeFor(4, q(MULTI[3]))), { group: 'group', option: 'checkbox' });
});

check('toggleSelection does not mutate the selections it was given; selectOption neither', () => {
  const before = { [U(1)]: MULTI[2][0] };
  const copy = { ...before };
  toggleSelection(before, U(1), MULTI[2][0]);
  toggleSelection(before, U(2), MULTI[2][1]);
  selectOption(before, U(2), MULTI[2][1], 'single');
  selectOption(before, U(2), MULTI[2][1], 'multi');
  assert.deepEqual(before, copy);
});

check('option state: selection, then marks after submit, then the answer after Show answer', () => {
  const [a, b] = SINGLE[3];
  const none = { marks: null, showAnswer: false };
  assert.equal(imageOptionState(a, { selected: false, ...none }), 'default');
  assert.equal(imageOptionState(a, { selected: true, ...none }), 'selected');
  // After submit: only the chosen option carries a mark; the rest stay plain.
  const marks = { [U(1)]: 'incorrect' as const };
  assert.equal(imageOptionState(a, { selected: true, marks, showAnswer: false }), 'incorrect');
  assert.equal(imageOptionState(b, { selected: false, marks, showAnswer: false }), 'default');
  // Show answer: every correct option is correct, none of the others is marked.
  assert.equal(imageOptionState(b, { selected: false, marks: null, showAnswer: true }), 'correct');
  assert.equal(imageOptionState(a, { selected: true, marks: null, showAnswer: true }), 'default');
});

check('the control: a radio for single, a checkbox for multi', () => {
  assert.equal(indicatorKind('single'), 'radio');
  assert.equal(indicatorKind('multi'), 'checkbox');
  assert.equal(indicatorKind(selectionModeFor(2, q(SINGLE[3]))), 'radio');
  assert.equal(indicatorKind(selectionModeFor(4, q(MULTI[3]))), 'checkbox');
});

check('isChecked reads the selection only', () => {
  const [a, b] = SINGLE[3];
  const sel = corporateSelections([a], 'single');
  assert.equal(isChecked(sel, a.questionoptionid), true);
  assert.equal(isChecked(sel, b.questionoptionid), false);
  assert.equal(isChecked({}, a.questionoptionid), false);
  assert.equal(isChecked({ [a.questionoptionid]: {} }, a.questionoptionid), false);
});

check('checked is the learner\'s selection only: a revealed correct option is not checked, a wrong chosen one still is', () => {
  // The card reads `selected` (selections) for checked, never the state.
  const [a, b] = SINGLE[3];
  // After Submit with the wrong option chosen: it is checked (and marked wrong); the right one is not (and unmarked).
  const sel = corporateSelections([a], 'single');
  const marks = evaluateMcqImage(SINGLE[3], sel).perItem;
  assert.equal(!_.isEmpty(sel[a.questionoptionid]), true);
  assert.equal(imageOptionState(a, { selected: true, marks, showAnswer: false }), 'incorrect');
  assert.equal(!_.isEmpty(sel[b.questionoptionid]), false);
  assert.equal(imageOptionState(b, { selected: false, marks, showAnswer: false }), 'default');
  // After Show answer the selection is cleared, so nothing is checked, while the correct one looks correct.
  assert.equal(imageOptionState(b, { selected: false, marks: null, showAnswer: true }), 'correct');
});

check('perItem marks only the chosen options, by their own correctness', () => {
  const o = MULTI[4];
  const r = evaluateMcqImage(o, corporateSelections([o[1], o[2]]));
  assert.deepEqual(r.perItem, { [U(2)]: 'incorrect', [U(3)]: 'correct' });
  assert.deepEqual(evaluateMcqImage(o, {}).perItem, {});
});

// --- Tile sizing (from the shell's measured layout) ------------------------
const L = (availableWidth: number, availableHeight: number, compact = false) => ({ availableWidth, availableHeight, compact });
const plan = (count: number, layout: ReturnType<typeof L> | null, breakpointSize = 175) => planImageGrid({ count, breakpointSize, layout });
const cellSide = (W: number, cols: number, frame: number, gap: number) => Math.floor((W - gap * (cols - 1)) / cols) - 2 * frame;

check('unmeasured (layout null): the breakpoint size, two columns for several options, one for a lone option', () => {
  assert.deepEqual(plan(4, null), { columns: 2, side: 175, compact: false, frame: CARD_FRAME, gap: GRID_GAP });
  assert.equal(plan(1, null).columns, 1);
});

check('regular: a 2x2 for four options, exactly two columns wide, on every breakpoint size', () => {
  for (const [bp, W, H] of [[256, 760, 900], [175, 760, 900], [150, 350, 560], [150, 350, 460]] as const) {
    const p = plan(4, L(W, H), bp);
    assert.equal(p.columns, 2, `${bp}/${W}/${H}`);
    assert.equal(p.compact, false);
    assert.ok(planWidth(p) <= W, 'fits the width');
    assert.ok(planWidth(p) < 3 * (p.side + 2 * CARD_FRAME) + 2 * GRID_GAP, 'a third card never fits on a row');
  }
  assert.equal(plan(3, L(760, 900), 256).columns, 2);
});

check('regular width: never wider than its cell (a 390 phone gets two ~150 pictures, not 175)', () => {
  const p = plan(4, L(350, 900), 175);
  assert.equal(p.side, cellSide(350, 2, CARD_FRAME, GRID_GAP));
  assert.ok(p.side < 175);
  assert.equal(plan(4, L(760, 900), 256).side, 256);
});

check('regular height: fits the measured height, and refits when the result strip takes its part', () => {
  const before = plan(4, L(350, 460), 175);
  const after = plan(4, L(350, 460 - 110), 175); // availableHeight drops by the strip
  assert.ok(after.side < before.side, 'smaller once the strip shows');
  assert.ok(planHeight(after, 4) <= 460 - 110, 'the whole grid, with its captions, is above the strip');
  assert.ok(planHeight(before, 4) <= 460);
  // Never below the minimum for height, but never wider than its cell.
  assert.equal(plan(4, L(760, 40), 256).side, REGULAR_MIN_TILE);
  assert.equal(plan(4, L(130, 10), 150).side, cellSide(130, 2, CARD_FRAME, GRID_GAP));
  assert.ok(cellSide(130, 2, CARD_FRAME, GRID_GAP) < REGULAR_MIN_TILE);
});

check('compact (a phone on its side): one row of four, captions on the picture, so the row is only the picture and its frame tall', () => {
  const p = plan(4, L(684, 200, true), 175);
  assert.equal(p.compact, true);
  assert.equal(p.columns, 4);
  assert.equal(p.frame, COMPACT_CARD_FRAME);
  assert.equal(p.gap, COMPACT_GRID_GAP);
  assert.ok(planWidth(p) <= 684);
  // No caption row under the picture in compact.
  assert.equal(planHeight(p, 4), p.side + 2 * COMPACT_CARD_FRAME);
  assert.ok(planHeight(p, 4) <= 200);
  assert.ok(p.side >= 64, 'about 64 or more before Submit');
});

check('compact refits after Submit: smaller with the strip, down to the floor, never past the width', () => {
  const before = plan(4, L(684, 140, true), 175);
  const after = plan(4, L(684, 72, true), 175);
  assert.ok(after.side < before.side);
  assert.equal(after.side, 72 - 2 * COMPACT_CARD_FRAME);
  assert.ok(planHeight(after, 4) <= 72, 'the whole row is above the strip');
  // Starved of height: the floor, and no wider than the cell.
  assert.equal(plan(4, L(684, 10, true), 175).side, COMPACT_MIN_TILE);
  assert.equal(plan(4, L(120, 600, true), 175).side, cellSide(120, plan(4, L(120, 600, true), 175).columns, COMPACT_CARD_FRAME, COMPACT_GRID_GAP));
});

check('compact floor is 56: a recognisable photo; below that room the page scrolls rather than shrink it', () => {
  assert.equal(COMPACT_MIN_TILE, 56);
  // 812 x 375 on the web, after Submit, with the question clamped: the body
  // has about 79 (English) to 70 (two-line Khmer with heading audio).
  for (const room of [79, 70, 64]) {
    const p = plan(4, L(684, room, true), 175);
    assert.equal(p.columns, 4);
    assert.equal(p.side, room - 2 * COMPACT_CARD_FRAME);
    assert.ok(p.side >= COMPACT_MIN_TILE && planHeight(p, 4) <= room, `room ${room}`);
  }
  // Less room than a 56 picture needs: the floor, and it no longer fits.
  const tight = plan(4, L(684, 60, true), 175);
  assert.equal(tight.side, COMPACT_MIN_TILE);
  assert.ok(planHeight(tight, 4) > 60);
});

check('compact wraps to more rows only when the row cannot fit at the smallest size', () => {
  const narrow = plan(4, L(120, 400, true), 175);
  assert.ok(narrow.columns < 4 && narrow.columns >= 1);
  assert.ok(planWidth(narrow) <= 120);
  assert.equal(plan(1, L(684, 200, true), 175).columns, 1);
});

check('the plan is stable: the same layout gives the same plan (no feedback from its own result)', () => {
  assert.deepEqual(plan(4, L(700, 500)), plan(4, L(700, 500)));
  assert.deepEqual(plan(4, L(700, 100, true)), plan(4, L(700, 100, true)));
});

check('CARD_CAPTION covers the caption row (the gap and the 48 row)', () => {
  assert.equal(CARD_CAPTION, 54);
});

// --- Files ------------------------------------------------------------------
check('option media: a picture is the picture; an audio file is the audio, and the picture is missing', () => {
  assert.deepEqual(optionMediaNames({ questionoptionfile: { filename: 'a.png', filetype: 6 } }), { image: 'a.png', audio: '' });
  assert.deepEqual(optionMediaNames({ questionoptionfile: { filename: 'a.mp3', filetype: 1 } }), { image: '', audio: 'a.mp3' });
  assert.deepEqual(optionMediaNames({ questionoptionfile: null }), { image: '', audio: '' });
  assert.deepEqual(optionMediaNames({}), { image: '', audio: '' });
});

check('a picture with no text is named "Picture A" by position, never by its answer, plus "unavailable" when missing', () => {
  assert.equal(optionLetter(0), 'A');
  assert.equal(optionLetter(3), 'D');
  assert.equal(optionAccessibleName({ text: '', pictureName: 'Picture C', unavailable: null }), 'Picture C');
  assert.equal(optionAccessibleName({ text: '   ', pictureName: 'Picture C', unavailable: null }), 'Picture C');
  assert.equal(optionAccessibleName({ text: null, pictureName: 'Picture B', unavailable: 'Image unavailable' }), 'Picture B, Image unavailable');
  assert.equal(optionAccessibleName({ text: 'Circle', pictureName: 'Picture A', unavailable: 'Image unavailable' }), 'Circle');
});

console.log(`mcqImage: ${passed} checks passed`);
