/**
 * Corporate matching (template 7): the tap state machine (picking, placing,
 * taking back, either tap order), when Submit is enabled, the marks and
 * counts, and how each slot and chip looks. Grading equivalence with the kids
 * renderer and the server is in src/utils/__tests__/answerV1.ts.
 *
 * Plain script run by `tsx` (package.json `test:matching`). Exits non-zero on
 * the first failed check.
 */
import assert from 'node:assert/strict';
import {
  answerLetters,
  answerName,
  bankOrder,
  chipState,
  instructionText,
  letterFor,
  promptName,
  promptVisual,
  slotA11yLabel,
  Tr,
  contentKind,
  correctPlacement,
  dropChip,
  dropTaps,
  EMPTY_MATCH,
  evaluateMatching,
  isReady,
  MatchTapState,
  pressChip,
  pressSlot,
  slotState,
} from '../matchingLogic';
import { INITIAL_SHELL_STATE, shellPress } from '../shellLogic';

let passed = 0;
// CHECK_ONLY=<text> runs only the checks whose name contains it (used to
// show a single check catching a mutation that earlier checks also catch).
function check(name: string, fn: () => void) {
  if (process.env.CHECK_ONLY && !name.includes(process.env.CHECK_ONLY)) return;
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const A = 'a', B = 'b', C = 'c';
const SLOTS = [A, B, C];
const options = SLOTS.map(id => ({ questionoptionid: id }));
const run = (...steps: Array<(s: MatchTapState) => MatchTapState>) =>
  steps.reduce((s, f) => f(s), EMPTY_MATCH);
const chip = (id: string) => (s: MatchTapState) => pressChip(s, id);
const slot = (id: string) => (s: MatchTapState) => pressSlot(s, id);

check('chip then slot places the chip', () => {
  const s = run(chip(B), slot(A));
  assert.deepEqual(s, { placed: { [A]: B }, pickedChip: null, activeSlot: null });
});

check('slot then chip places the chip', () => {
  const waiting = run(slot(A));
  assert.equal(waiting.activeSlot, A);
  assert.deepEqual(run(slot(A), chip(B)), { placed: { [A]: B }, pickedChip: null, activeSlot: null });
});

check('picking a chip twice puts it down; picking another swaps the pick', () => {
  assert.equal(run(chip(A), chip(A)).pickedChip, null);
  assert.equal(run(chip(A), chip(B)).pickedChip, B);
});

check('an empty slot tapped twice stops waiting; another empty slot moves the wait', () => {
  assert.equal(run(slot(A), slot(A)).activeSlot, null);
  assert.equal(run(slot(A), slot(B)).activeSlot, B);
});

check('tapping a placed chip sends it back to the bank', () => {
  const s = run(chip(B), slot(A), slot(A));
  assert.deepEqual(s, EMPTY_MATCH);
  assert.equal(chipState(B, s), 'default');
});

check('a placed chip is a ghost in the bank and cannot be picked', () => {
  const s = run(chip(B), slot(A));
  assert.equal(chipState(B, s), 'used');
  assert.equal(pressChip(s, B), s);
});

check('placing on a filled slot swaps: the old chip returns to the bank', () => {
  const s = run(chip(B), slot(A), chip(C), slot(A));
  assert.deepEqual(s.placed, { [A]: C });
  assert.equal(chipState(B, s), 'default');
  assert.equal(chipState(C, s), 'used');
});

check('a slot waiting and a chip picked never both hold', () => {
  const s = run(slot(A), chip(B), chip(C));
  assert.equal(s.activeSlot, null);
  const t = run(chip(B), slot(A), slot(C));
  assert.equal(t.pickedChip, null);
  // A chip picked, then an empty slot tapped: places, does not arm the slot.
  assert.equal(run(chip(B), slot(C)).activeSlot, null);
});

check('a chip cannot be in two slots', () => {
  for (const steps of [
    [chip(A), slot(A), chip(A), slot(B)],
    [slot(B), chip(A), slot(A), chip(A)],
  ]) {
    const s = run(...steps);
    const chips = Object.values(s.placed);
    assert.equal(new Set(chips).size, chips.length);
  }
});

check('Submit is enabled only when every slot holds a chip', () => {
  assert.equal(isReady({}, SLOTS), false);
  assert.equal(isReady({ [A]: A, [B]: B }, SLOTS), false);
  assert.equal(isReady({ [A]: A, [B]: B, [C]: C }, SLOTS), true);
  assert.equal(isReady({ [A]: B, [B]: A, [C]: C }, SLOTS), true); // wrong pairs are still an answer
  assert.equal(isReady({ [A]: A, [B]: B, [C]: '' }, SLOTS), false);
  assert.equal(isReady({}, []), false);
  // Taking a chip back turns it off again.
  const full = run(chip(A), slot(A), chip(B), slot(B), chip(C), slot(C));
  assert.equal(isReady(full.placed, SLOTS), true);
  assert.equal(isReady(pressSlot(full, B).placed, SLOTS), false);
});

check('the shell refuses Submit until the body is ready', () => {
  const ev = () => evaluateMatching(options, {});
  const blocked = shellPress(INITIAL_SHELL_STATE, 'submit', { mode: 'practice', ready: false, evaluate: ev });
  assert.equal(blocked.effect.kind, 'none');
  const ok = shellPress(INITIAL_SHELL_STATE, 'submit', { mode: 'practice', ready: true, evaluate: ev });
  assert.equal(ok.effect.kind, 'submit');
});

check('marks: placed slots only, by their own correctness, with counts', () => {
  const ev = evaluateMatching(options, { [A]: A, [B]: C });
  assert.deepEqual(ev.perItem, { [A]: 'correct', [B]: 'incorrect' });
  assert.deepEqual(ev.summary, { correctCount: 1, total: 3 });
  assert.equal(ev.iscorrect, false);
  const all = evaluateMatching(options, { [A]: A, [B]: B, [C]: C });
  assert.equal(all.iscorrect, true);
  assert.deepEqual(all.answer, { v: 1, type: 'match', pairs: { [A]: A, [B]: B, [C]: C } });
  assert.deepEqual(all.summary, { correctCount: 3, total: 3 });
});

check('slot states: empty, target while a chip is picked, active, filled, then the result', () => {
  const none = { marks: null, showAnswer: false };
  assert.equal(slotState(A, EMPTY_MATCH, none), 'empty');
  assert.equal(slotState(A, run(chip(B)), none), 'target');
  assert.equal(slotState(A, run(slot(A)), none), 'active');
  assert.equal(slotState(B, run(slot(A)), none), 'empty');
  assert.equal(slotState(A, run(chip(B), slot(A)), none), 'filled');
  const s = run(chip(A), slot(A), chip(C), slot(B));
  const marks = { [A]: 'correct', [B]: 'incorrect' } as const;
  assert.equal(slotState(A, s, { marks, showAnswer: false }), 'correct');
  assert.equal(slotState(B, s, { marks, showAnswer: false }), 'incorrect');
});

check('Show answer: every slot is correct, with its own chip', () => {
  const placed = correctPlacement(SLOTS);
  assert.deepEqual(placed, { [A]: A, [B]: B, [C]: C });
  for (const id of SLOTS) {
    assert.equal(slotState(id, { ...EMPTY_MATCH, placed }, { marks: null, showAnswer: true }), 'correct');
  }
});

check('content kinds: text, picture (type 6), sound (any other file)', () => {
  assert.deepEqual(contentKind({ text: 'cat' }), { kind: 'text', hasFile: false, hasText: true });
  assert.deepEqual(contentKind({ text: ' ', file: { filename: 'x.jpg', filetype: 6 } }), {
    kind: 'image', hasFile: true, hasText: false,
  });
  assert.equal(contentKind({ text: '', file: { filename: 'x.wav', filetype: 1 } }).kind, 'audio');
  assert.equal(contentKind({ text: 'hat', file: { filename: '', filetype: 1 } }).kind, 'text');
  assert.equal(contentKind({}).hasText, false);
});


// ---- labels ----------------------------------------------------------------
const t: Tr = (key, o) => (o ? `${key}${JSON.stringify(o)}` : key);
const sound = { filename: 's.wav', filetype: 1 };
const picture = { filename: 'p.png', filetype: 6 };
const opt = (id: string, prompt: string, answer: string, files: { p?: any; a?: any } = {}) => ({
  questionoptionid: id,
  questionoptiontext: prompt,
  questionoptionfile: files.p ?? null,
  questionassociate: { questionassociatetext: answer, questionassociatefile: files.a ?? null },
});
// A tiny seeded generator, so the shuffles below are reproducible.
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

check('the bank order is a uniform shuffle: every order appears, about equally often', () => {
  // A stronger generator than the LCG above, so the test measures bankOrder, not the seed.
  const mulberry = (a: number) => () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  for (const [n, trials] of [[2, 4000], [3, 12000], [4, 48000]] as const) {
    const ids = Array.from({ length: n }, (_x, i) => `id${i}`);
    const rng = mulberry(n * 7919);
    const counts = new Map<string, number>();
    for (let k = 0; k < trials; k++) {
      const bank = bankOrder(ids, rng);
      assert.deepEqual([...bank].sort(), [...ids].sort(), 'a permutation');
      counts.set(bank.join(), (counts.get(bank.join()) ?? 0) + 1);
    }
    const orders = [1, 2, 3, 4].slice(0, n).reduce((f, x) => f * x, 1); // n!
    assert.equal(counts.size, orders, `n=${n}: all ${orders} orders occur (got ${counts.size})`);
    const expected = trials / orders;
    for (const [order, c] of counts)
      assert.ok(Math.abs(c - expected) < 0.15 * expected, `n=${n}: ${order} seen ${c} times, expected about ${expected}`);
    // In particular an answer sits at its own prompt's position about 1 time in n.
    const fixedFirst = [...counts].filter(([o]) => o.startsWith('id0,')).reduce((s2, [, c]) => s2 + c, 0);
    assert.ok(Math.abs(fixedFirst - trials / n) < 0.1 * (trials / n), `n=${n}: first chip is prompt 1's ${fixedFirst} times`);
  }
  assert.deepEqual(bankOrder(['only']), ['only']);
});

check('an answer without words is labelled by its bank letter (bank position), not by its prompt\'s row', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const options = ids.map(id => opt(id, '', '', { a: sound }));
  for (let seed = 1; seed <= 300; seed++) {
    const bank = bankOrder(ids, seeded(seed));
    const letters = answerLetters(bank);
    ids.forEach((id, row) => {
      const label = answerName(options[row], letters[id], t);
      assert.equal(label, `corporate.matching.answerSound{"letter":"${letters[id]}"}`);
      void row;
    });
    // The letter is bank position, and a function of the bank alone: placing a chip cannot renumber it.
    bank.forEach((id, pos) => assert.equal(letters[id], letterFor(pos)));
    assert.deepEqual(answerLetters(bank), letters);
  }
});

check('prompt names: words, else Sound n / Picture n; a picture prompt draws no caption', () => {
  assert.equal(promptName(opt('a', 'cat', 'hat'), 1, t), 'cat');
  assert.equal(promptName(opt('a', '', '', { p: sound }), 2, t), 'corporate.matching.promptSound{"n":2}');
  assert.equal(promptName(opt('a', ' ', '', { p: picture }), 3, t), 'corporate.matching.promptPicture{"n":3}');
  assert.equal(promptVisual(opt('a', '', '', { p: picture }), 3, t), '');
  assert.equal(promptVisual(opt('a', '', '', { p: sound }), 2, t), 'corporate.matching.promptSound{"n":2}');
  assert.equal(answerName(opt('a', 'x', '', { a: picture }), 'C', t), 'corporate.matching.answerPicture{"letter":"C"}');
  assert.equal(answerName(opt('a', 'x', 'hat'), 'C', t), 'hat');
});

check('slot labels name the prompt, then the answer or the chip that would go in', () => {
  const base = { prompt: 'Expenses', answer: 'Money going out', pickedName: 'Profit' };
  assert.equal(slotA11yLabel({ ...base, state: 'empty' }, t), 'corporate.matching.slotEmpty{"prompt":"Expenses"}');
  assert.equal(slotA11yLabel({ ...base, state: 'active' }, t), 'corporate.matching.slotActive{"prompt":"Expenses"}');
  assert.equal(slotA11yLabel({ ...base, state: 'target' }, t), 'corporate.matching.slotTarget{"prompt":"Expenses","chip":"Profit"}');
  assert.equal(slotA11yLabel({ ...base, pickedName: '', state: 'filled' }, t), 'corporate.matching.slotFilled{"prompt":"Expenses","answer":"Money going out"}');
  // A chip is picked: tapping a filled slot swaps, it does not take back.
  assert.equal(slotA11yLabel({ ...base, state: 'filled' }, t), 'corporate.matching.slotSwap{"prompt":"Expenses","answer":"Money going out","chip":"Profit"}');
  // Locked: no "tap" advice.
  assert.equal(slotA11yLabel({ ...base, pickedName: '', state: 'filled', locked: true }, t), 'corporate.matching.slotPlaced{"prompt":"Expenses","answer":"Money going out"}');
  assert.equal(slotA11yLabel({ ...base, state: 'correct' }, t), 'kit.mark.labelCorrect{"label":"Expenses: Money going out"}');
  assert.equal(slotA11yLabel({ ...base, state: 'incorrect' }, t), 'kit.mark.labelIncorrect{"label":"Expenses: Money going out"}');
});

check('the instruction says "word" only when every prompt is a word', () => {
  const idle = { pickedName: 'x', activePrompt: 'y' };
  assert.equal(instructionText({ tap: EMPTY_MATCH, allText: true, ...idle }, t), 'corporate.matching.instruction');
  assert.equal(instructionText({ tap: EMPTY_MATCH, allText: false, ...idle }, t), 'corporate.matching.instructionPrompt');
  const picked = run(chip(A));
  assert.equal(instructionText({ tap: picked, allText: true, ...idle }, t), 'corporate.matching.pickedHint{"label":"x"}');
  assert.equal(instructionText({ tap: picked, allText: false, ...idle }, t), 'corporate.matching.pickedHintPrompt{"label":"x"}');
  assert.equal(instructionText({ tap: run(slot(A)), allText: false, ...idle }, t), 'corporate.matching.slotHint{"label":"y"}');
});

// ---- dragging: each drop ends exactly where its taps end ------------------

check('drag a bank chip onto a slot = tap the chip, then the slot (either way the old chip goes back)', () => {
  const s0 = EMPTY_MATCH;
  const d = dropChip(s0, A, { kind: 'bank' }, { kind: 'slot', slotId: B });
  assert.deepEqual(d, run(chip(A), slot(B)));
  assert.deepEqual(d.placed, { [B]: A });
  // Onto a filled slot: the chip that was there goes back to the bank.
  const d2 = dropChip(d, C, { kind: 'bank' }, { kind: 'slot', slotId: B });
  assert.deepEqual(d2, run(chip(A), slot(B), chip(C), slot(B)));
  assert.deepEqual(d2.placed, { [B]: C });
});

check('drag a placed chip onto another slot: they swap (= take back, place, place the other)', () => {
  const s = run(chip(A), slot(A), chip(B), slot(B));
  const d = dropChip(s, A, { kind: 'slot', slotId: A }, { kind: 'slot', slotId: B });
  assert.deepEqual(d.placed, { [A]: B, [B]: A });
  assert.deepEqual(d, run(chip(A), slot(A), chip(B), slot(B), slot(A), chip(A), slot(B), chip(B), slot(A)));
  // Onto an empty slot: it simply moves.
  const m = dropChip(s, A, { kind: 'slot', slotId: A }, { kind: 'slot', slotId: C });
  assert.deepEqual(m.placed, { [B]: B, [C]: A });
  assert.deepEqual(m, run(chip(A), slot(A), chip(B), slot(B), slot(A), chip(A), slot(C)));
});

check('drag a placed chip to the bank = tap its slot (take back)', () => {
  const s = run(chip(A), slot(B));
  const d = dropChip(s, A, { kind: 'slot', slotId: B }, { kind: 'bank' });
  assert.deepEqual(d, run(chip(A), slot(B), slot(B)));
  assert.deepEqual(d.placed, {});
});

check('a drop on nothing, on its own slot, or a bank chip on the bank, changes nothing', () => {
  const s = run(chip(A), slot(B));
  assert.deepEqual(dropChip(s, A, { kind: 'slot', slotId: B }, null), s);
  assert.deepEqual(dropChip(s, A, { kind: 'slot', slotId: B }, { kind: 'slot', slotId: B }), s);
  assert.deepEqual(dropChip(s, C, { kind: 'bank' }, { kind: 'bank' }), s);
  assert.deepEqual(dropChip(s, C, { kind: 'bank' }, null), s);
  // Stale drags (the chip is not where the drag says) do nothing.
  assert.deepEqual(dropTaps(s.placed, A, { kind: 'bank' }, { kind: 'slot', slotId: C }), []);
  assert.deepEqual(dropTaps(s.placed, C, { kind: 'slot', slotId: B }, { kind: 'bank' }), []);
});

check('a drag starts from a clean slate: a pick or a waiting slot is put down', () => {
  const picked = run(chip(B));
  assert.deepEqual(dropChip(picked, A, { kind: 'bank' }, { kind: 'slot', slotId: C }), run(chip(A), slot(C)));
  assert.deepEqual(dropChip(picked, A, { kind: 'bank' }, null), EMPTY_MATCH);
  const waiting = run(slot(A));
  const d = dropChip(waiting, B, { kind: 'bank' }, { kind: 'slot', slotId: C });
  assert.deepEqual(d, { placed: { [C]: B }, pickedChip: null, activeSlot: null });
});

// What a drop must do, written from the drop's definition (not from the
// tap functions the code uses), for the sweep below to compare against.
function expectedPlaced(
  placed: Readonly<Record<string, string>>,
  chipId: string,
  from: { kind: 'bank' } | { kind: 'slot'; slotId: string },
  to: { kind: 'bank' } | { kind: 'slot'; slotId: string } | null,
): Record<string, string> {
  const out = { ...placed };
  if (to === null) return out;
  if (from.kind === 'bank') {
    if (to.kind === 'bank' || Object.values(placed).includes(chipId)) return out;
    out[to.slotId] = chipId; // whatever was there is no longer in a slot: back in the bank
    return out;
  }
  if (placed[from.slotId] !== chipId) return out;
  if (to.kind === 'bank') {
    delete out[from.slotId];
    return out;
  }
  if (to.slotId === from.slotId) return out;
  const displaced = placed[to.slotId];
  out[to.slotId] = chipId;
  if (displaced === undefined) delete out[from.slotId];
  else out[from.slotId] = displaced; // the two swap
  return out;
}

check('every drop from every reachable state: the exact expected answer, and every chip in exactly one place', () => {
  // All placements of 3 chips into 3 slots (each chip at most once), with
  // nothing picked, a chip picked, or a slot waiting; and every drop.
  const ids = [A, B, C];
  const placements: Array<Record<string, string>> = [];
  const choices = [undefined, ...ids];
  for (const x of choices) for (const y of choices) for (const z of choices) {
    const vals = [x, y, z].filter(Boolean);
    if (new Set(vals).size !== vals.length) continue;
    const placed: Record<string, string> = {};
    [x, y, z].forEach((v, i) => { if (v) placed[ids[i]] = v; });
    placements.push(placed);
  }
  let drops = 0;
  for (const placed of placements) {
    const inBank = ids.filter(c => !Object.values(placed).includes(c));
    const starts: MatchTapState[] = [
      { placed, pickedChip: null, activeSlot: null },
      ...inBank.map(c => ({ placed, pickedChip: c, activeSlot: null })),
      ...ids.filter(sl => !(sl in placed)).map(sl => ({ placed, pickedChip: null, activeSlot: sl })),
    ];
    const sources: Array<[string, any]> = [
      ...inBank.map(c => [c, { kind: 'bank' }] as [string, any]),
      ...Object.entries(placed).map(([sl, c]) => [c, { kind: 'slot', slotId: sl }] as [string, any]),
    ];
    const targets: any[] = [null, { kind: 'bank' }, ...ids.map(id => ({ kind: 'slot', slotId: id }))];
    for (const s of starts) for (const [c, from] of sources) for (const to of targets) {
      const d = dropChip(s, c, from, to);
      drops += 1;
      const where = `${JSON.stringify(s)} drop ${c} ${JSON.stringify(from)} -> ${JSON.stringify(to)}`;
      // The whole state, against the definition.
      assert.deepEqual(d, { placed: expectedPlaced(placed, c, from, to), pickedChip: null, activeSlot: null }, where);
      // Conservation: every chip is in exactly one place (one slot, or the
      // bank), only known chips are placed, and only known slots hold one.
      const vals = Object.values(d.placed);
      assert.equal(new Set(vals).size, vals.length, `no chip in two slots: ${where}`);
      for (const k of Object.keys(d.placed)) assert.ok(ids.includes(k), `unknown slot: ${where}`);
      for (const id of ids) {
        const inSlots: number = Object.keys(d.placed).filter(k => d.placed[k] === id).length;
        const inBankToo: number = inSlots === 0 ? 1 : 0;
        assert.equal(inSlots + inBankToo, 1, `chip ${id} in exactly one place: ${where}`);
      }
      assert.equal(vals.length + ids.filter(i => !vals.includes(i)).length, ids.length, `chips conserved: ${where}`);
    }
  }
  assert.ok(drops > 300, `${drops} drops`);
});

console.log(`matching: ${passed} checks passed`);
