/**
 * Corporate multiple choice, pictures (templates 2 and 4):
 *  - grading: for every tap sequence (including un-taps) on 2 to 4 options,
 *    the corporate path sends the same `iscorrect` and answerV1 (same ids,
 *    same order) as today's PracticeMCQImage, and the server's rules grade
 *    that answer the way the device did;
 *  - selection state and the option's look after a result and Show answer;
 *  - the tile sizing helper (measured width and height, no minHeight);
 *  - which file is an option's picture and which its audio.
 *
 * Plain script run by `tsx` (package.json `test:mcqimage`).
 */
import assert from 'node:assert/strict';
import _ from 'lodash';
import { choiceAnswer } from '../../../../../utils/answerV1';
import { MIN_TILE_SIZE } from '../../../Components/MCQImage/layout';
import { INITIAL_SHELL_STATE, shellPress } from '../../shellLogic';
import {
  CARD_CAPTION,
  CARD_FRAME,
  GRID_GAP,
  availableGridHeight,
  evaluateMcqImage,
  imageOptionState,
  isMultiTemplate,
  optionMediaNames,
  planImageGrid,
  planWidth,
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
function corporateSelections(taps: Opt[]) {
  let selections: Record<string, Opt> = {};
  for (const qp of taps) selections = toggleSelection(selections, qp.questionoptionid, qp);
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

for (const [templateId, fixtures] of [[2, SINGLE], [4, MULTI]] as const) {
  for (const n of [2, 3, 4]) {
    check(`template ${templateId}, ${n} options: every tap sequence (un-taps included) grades and sends what the kids renderer does`, () => {
      const options = fixtures[n];
      let count = 0;
      let unselected = 0;
      for (const taps of tapWords(options, n === 4 ? 6 : 7)) {
        const kSel = kidsSelections(taps);
        const cSel = corporateSelections(taps);
        assert.deepEqual(Object.keys(cSel), Object.keys(kSel), 'same selection, same order');
        const kids = kidsSubmit(options, kSel);
        const corp = evaluateMcqImage(options, cSel);
        assert.equal(corp.iscorrect, kids.isCorrect);
        assert.deepEqual(corp.answer, kids.answer);
        // The server grades the sent answer as the device graded it.
        assert.equal(serverGradeChoice(options, (corp.answer as { selected: string[] }).selected), corp.iscorrect);
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
        if (taps.length > new Set(taps.map(t => t.questionoptionid)).size) unselected++;
        count++;
      }
      assert.ok(count > 50, `tried ${count} sequences`);
      assert.ok(unselected > 0, 'some sequences un-tap');
    });
  }
}

check('an empty answer is sent as no selection and graded wrong, as today', () => {
  const r = evaluateMcqImage(SINGLE[4], {});
  assert.equal(r.iscorrect, false);
  assert.deepEqual(r.answer, kidsSubmit(SINGLE[4], {}).answer);
});

check('selection order is the order tapped; un-select then re-select moves it last', () => {
  const o = MULTI[4];
  const s = corporateSelections([o[2], o[0], o[2], o[2]]);
  assert.deepEqual(Object.keys(s), [U(1), U(3)]);
  assert.deepEqual(Object.keys(corporateSelections([o[0]])), [U(1)]);
  assert.deepEqual(Object.keys(corporateSelections([o[0], o[0]])), []);
});

check('toggleSelection does not mutate the selections it was given', () => {
  const before = { [U(1)]: MULTI[2][0] };
  const copy = { ...before };
  toggleSelection(before, U(1), MULTI[2][0]);
  toggleSelection(before, U(2), MULTI[2][1]);
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

check('perItem marks only the chosen options, by their own correctness', () => {
  const o = MULTI[4];
  const r = evaluateMcqImage(o, corporateSelections([o[1], o[2]]));
  assert.deepEqual(r.perItem, { [U(2)]: 'incorrect', [U(3)]: 'correct' });
  assert.deepEqual(evaluateMcqImage(o, {}).perItem, {});
});

check('template 4 is multi, template 2 is single', () => {
  assert.equal(isMultiTemplate(4), true);
  assert.equal(isMultiTemplate('4'), true);
  assert.equal(isMultiTemplate(2), false);
  assert.equal(isMultiTemplate(undefined), false);
});

// --- Tile sizing ------------------------------------------------------------
const cellSide = (gridWidth: number) => Math.floor((gridWidth - GRID_GAP) / 2) - 2 * CARD_FRAME;
const rowHeight = (side: number) => side + 2 * CARD_FRAME + CARD_CAPTION;

check('unmeasured: the breakpoint size, two columns for several options, one for a lone option', () => {
  assert.deepEqual(planImageGrid({ count: 4, breakpointSize: 175, gridWidth: null, availableHeight: null }), { columns: 2, side: 175 });
  assert.deepEqual(planImageGrid({ count: 1, breakpointSize: 175, gridWidth: null, availableHeight: null }).columns, 1);
});

check('width: never wider than its cell (a 390 phone gets two 150-ish pictures, not 175)', () => {
  const p = planImageGrid({ count: 4, breakpointSize: 175, gridWidth: 350, availableHeight: null });
  assert.equal(p.side, cellSide(350));
  assert.ok(p.side < 175);
  // 320 wide: still two across, smaller.
  const small = planImageGrid({ count: 4, breakpointSize: 150, gridWidth: 280, availableHeight: null });
  assert.equal(small.side, cellSide(280));
  // 760 column: the breakpoint size caps it (the cell would allow far more).
  assert.equal(planImageGrid({ count: 4, breakpointSize: 256, gridWidth: 760, availableHeight: null }).side, 256);
});

check('height: tall rooms keep the size; short ones shrink it, never below the minimum', () => {
  const tall = planImageGrid({ count: 4, breakpointSize: 256, gridWidth: 760, availableHeight: 2 * rowHeight(256) + GRID_GAP + 40 });
  assert.equal(tall.side, 256);
  const tight = planImageGrid({ count: 4, breakpointSize: 256, gridWidth: 760, availableHeight: 2 * rowHeight(180) + GRID_GAP });
  assert.equal(tight.side, 180);
  const none = planImageGrid({ count: 4, breakpointSize: 256, gridWidth: 760, availableHeight: 40 });
  assert.equal(none.side, MIN_TILE_SIZE);
  // Two options are one row: the same room gives them a bigger picture than four.
  const two = planImageGrid({ count: 2, breakpointSize: 256, gridWidth: 760, availableHeight: 2 * rowHeight(180) + GRID_GAP });
  assert.ok(two.side > tight.side);
});

check('four options are a 2x2 in the 760 column and on a tall phone, on every breakpoint size', () => {
  for (const [breakpointSize, gridWidth, availableHeight] of [[256, 760, 900], [175, 760, 900], [150, 350, 560], [150, 350, null], [256, 760, null]] as const) {
    const p = planImageGrid({ count: 4, breakpointSize, gridWidth, availableHeight });
    assert.equal(p.columns, 2, `${breakpointSize}/${gridWidth}/${availableHeight}`);
  }
  // Three options: two columns, the last card centred on its own row.
  assert.equal(planImageGrid({ count: 3, breakpointSize: 256, gridWidth: 760, availableHeight: 900 }).columns, 2);
});

check('a desktop with room for two rows of a smaller picture keeps the 2x2 rather than one bigger row', () => {
  // 1280x800: 2 rows fit at 160, a single row would allow 165: the 2x2 stays.
  const p = planImageGrid({ count: 4, breakpointSize: 175, gridWidth: 760, availableHeight: 473 });
  assert.equal(p.columns, 2);
  assert.equal(p.side, 160);
});

check('a landscape phone, where height limits the picture, takes one row of four (half the height)', () => {
  const p = planImageGrid({ count: 4, breakpointSize: 175, gridWidth: 640, availableHeight: 60 });
  assert.equal(p.columns, 4);
  assert.equal(p.side, MIN_TILE_SIZE);
  // ...but not when one row would be smaller than two (a narrow phone).
  assert.equal(planImageGrid({ count: 4, breakpointSize: 150, gridWidth: 300, availableHeight: 60 }).columns, 2);
});

check('the grid is exactly its columns wide, so a third card never fits on a row', () => {
  const p = planImageGrid({ count: 4, breakpointSize: 175, gridWidth: 760, availableHeight: 900 });
  assert.equal(planWidth(p), 2 * (p.side + 2 * CARD_FRAME) + GRID_GAP);
  assert.ok(planWidth(p) < 3 * (p.side + 2 * CARD_FRAME) + 2 * GRID_GAP);
  assert.ok(planWidth(p) <= 760);
});

check('height never pushes a picture past its cell width, even below the minimum tile', () => {
  const p = planImageGrid({ count: 4, breakpointSize: 150, gridWidth: 200, availableHeight: 10 });
  assert.equal(p.side, cellSide(200));
  assert.ok(p.side < MIN_TILE_SIZE);
});

check('available height: the window less the body top and the reserve, never negative', () => {
  assert.equal(availableGridHeight({ windowHeight: 812, bodyTop: 200, bottomReserve: 96 }), 516);
  assert.equal(availableGridHeight({ windowHeight: 375, bodyTop: 400, bottomReserve: 96 }), 0);
});

check('the plan is stable: the same inputs give the same plan (no feedback from its own result)', () => {
  const args = { count: 4, breakpointSize: 175, gridWidth: 700, availableHeight: 500 };
  assert.deepEqual(planImageGrid(args), planImageGrid(args));
});

// --- Files ------------------------------------------------------------------
check('option media: a picture is the picture; an audio file is the audio, and the picture is missing', () => {
  assert.deepEqual(optionMediaNames({ questionoptionfile: { filename: 'a.png', filetype: 6 } }), { image: 'a.png', audio: '' });
  assert.deepEqual(optionMediaNames({ questionoptionfile: { filename: 'a.mp3', filetype: 1 } }), { image: '', audio: 'a.mp3' });
  assert.deepEqual(optionMediaNames({ questionoptionfile: null }), { image: '', audio: '' });
  assert.deepEqual(optionMediaNames({}), { image: '', audio: '' });
});

console.log(`mcqImage: ${passed} checks passed`);
