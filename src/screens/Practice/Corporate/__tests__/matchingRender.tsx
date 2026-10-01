/**
 * MatchingBody rendered (react-test-renderer over react-native-web, see
 * src/components/practices/__tests__/nativeStubs.ts): Submit stays disabled
 * (the body reports ready: false) until the last slot is filled, and comes
 * back off when a chip is taken back. Also that a slot is one screen-reader
 * stop that names its prompt, and that a picture-only prompt is announced.
 *
 * Plain script run by `tsx` (package.json `test:matching`). Exits non-zero on
 * the first failed check.
 */
import '../../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

const h = React.createElement;
const drag: { opts: any; draggables: Record<string, boolean> } = { opts: null, draggables: {} };
const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}${JSON.stringify(o)}` : key);
const extra: Record<string, unknown> = {
  'react-i18next': { __esModule: true, useTranslation: () => ({ t }) },
  '@/redux': { __esModule: true, useAppSelector: () => 'en' },
  '@/redux/slices': { __esModule: true, getSelectedLanguage: () => 'en' },
  // The drag primitives pull in gesture-handler. These stand-ins render their
  // children, record what each Draggable was given, and hand the test the
  // body's drop handler, so a drop can be driven as the gesture would.
  '@/components/drag': {
    __esModule: true,
    GripGlyph: () => h('span'),
    useDragToTarget: (opts: any) => {
      drag.opts = opts;
      return { active: null, guardPress: (fn: any) => fn, _: {} };
    },
    DragStage: (p: any) => h('div', null, p.children),
    DropTarget: (p: any) => h('div', null, p.children),
    Draggable: (p: any) => {
      drag.draggables[p.id] = !!(p.enabled ?? true);
      return h('div', { 'data-draggable': p.id }, p.children);
    },
  },
  'expo-av': { __esModule: true, Audio: { Sound: class { unloadAsync = async () => undefined; loadAsync = async () => undefined; } } },
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request in extra) return extra[request];
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';

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

const Q = (opts: unknown[]) => ({ questionobject: { questionoptions: opts } });
const o = (id: string, prompt: string, answer: string, files: { p?: any; a?: any } = {}) => ({
  questionoptionid: id,
  questionoptiontext: prompt,
  questionoptionfile: files.p ?? null,
  questionassociate: { questionassociatetext: answer, questionassociatefile: files.a ?? null },
});

function main() {
  const MatchingBody = require('../Matching/MatchingBody').default;
  const reports: Array<{ ready: boolean; evaluate: () => any }> = [];
  const report = (r: any) => reports.push(r);
  const render = (question: unknown) => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        h(MatchingBody, {
          question, mode: 'practice', tries: 1, resetKey: 0, resultState: 'answering',
          disabled: false, marks: null, showAnswer: false, report,
        }),
      );
    });
    return r;
  };
  const byId = (r: ReactTestRenderer, id: string) =>
    r.root.findAll(n => n.props?.testID === id && typeof n.props.onPress === 'function')[0];
  const tap = (n: TestRenderer.ReactTestInstance) => act(() => n.props.onPress({}));
  const chipFor = (r: ReactTestRenderer, text: string) =>
    r.root.findAll(n => typeof n.props?.testID === 'string' && n.props.testID.startsWith('match-chip-') &&
      typeof n.props.onPress === 'function' && n.props.accessibilityLabel === text)[0];
  const ready = () => reports[reports.length - 1].ready;

  const question = Q([o('a', 'cat', 'hat'), o('b', 'dog', 'log'), o('c', 'sun', 'run')]);

  check('Submit is not ready until the last slot is filled, and not again once a chip is taken back', () => {
    reports.length = 0;
    const r = render(question);
    assert.equal(ready(), false);
    tap(chipFor(r, 'hat')); tap(byId(r, 'match-slot-0'));
    assert.equal(ready(), false);
    tap(chipFor(r, 'log')); tap(byId(r, 'match-slot-1'));
    assert.equal(ready(), false, 'two of three');
    tap(chipFor(r, 'run')); tap(byId(r, 'match-slot-2'));
    assert.equal(ready(), true, 'all three placed');
    tap(byId(r, 'match-slot-1'));
    assert.equal(ready(), false, 'a chip taken back');
    // What is reported grades the current pairing.
    tap(chipFor(r, 'log')); tap(byId(r, 'match-slot-1'));
    assert.equal(reports[reports.length - 1].evaluate().iscorrect, true);
    act(() => r.unmount());
  });

  check('a slot is one screen-reader stop that names its prompt', () => {
    const r = render(question);
    const stop = (i: number) => byId(r, `match-slot-${i}`);
    assert.equal(stop(0).props.accessibilityLabel, 'corporate.matching.slotEmpty{"prompt":"cat"}');
    tap(chipFor(r, 'hat'));
    assert.equal(stop(1).props.accessibilityLabel, 'corporate.matching.slotTarget{"prompt":"dog","chip":"hat"}');
    // Enter, Space and a tap are all the Pressable's onPress.
    act(() => stop(0).props.onPress({}));
    assert.equal(stop(0).props.accessibilityLabel, 'corporate.matching.slotFilled{"prompt":"cat","answer":"hat"}');
    assert.equal(stop(0).props.accessibilityRole, 'button');
    // With another chip picked, the filled slot says it will swap.
    tap(chipFor(r, 'log'));
    assert.equal(stop(0).props.accessibilityLabel, 'corporate.matching.slotSwap{"prompt":"cat","answer":"hat","chip":"log"}');
    act(() => r.unmount());
  });

  check('wordless answers: letters follow bank position (A, B, C, D in bank order), and stay put when a chip is placed', () => {
    const snd = { filename: 's.wav', filetype: 1 };
    const q = Q(['a', 'b', 'c', 'd'].map(id => o(id, `prompt ${id}`, '', { a: snd })));
    const chipLabels = (r: ReactTestRenderer) =>
      r.root.findAll(n => typeof n.props?.testID === 'string' && n.props.testID.startsWith('match-chip-') &&
        !n.props.testID.includes('audio') && typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string')
        .filter((n, i, all) => all.findIndex(m => m.props.testID === n.props.testID) === i) // composite + host
        .map(n => n.props.accessibilityLabel as string);
    for (let tries = 1; tries <= 10; tries++) {
      let r!: ReactTestRenderer;
      act(() => {
        r = TestRenderer.create(
          h(MatchingBody, { question: q, mode: 'practice', tries, resetKey: 0, resultState: 'answering',
            disabled: false, marks: null, showAnswer: false, report }),
        );
      });
      const want = ['A', 'B', 'C', 'D'].map(l => `corporate.matching.answerSound{"letter":"${l}"}`);
      const before = chipLabels(r);
      assert.deepEqual(before, want, 'bank order reads A, B, C, D');
      // Place the first chip in slot 3: the others keep their letters, and the slot names it.
      const first = r.root.findAll(n => typeof n.props?.testID === 'string' && n.props.testID.startsWith('match-chip-') &&
        !n.props.testID.includes('audio') && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === before[0])[0];
      act(() => first.props.onPress({}));
      act(() => byId(r, 'match-slot-3').props.onPress({}));
      assert.deepEqual(chipLabels(r), want.slice(1), 'the rest keep their letters');
      const slot3 = byId(r, 'match-slot-3').props.accessibilityLabel as string;
      assert.ok(slot3.startsWith('corporate.matching.slotFilled') && slot3.includes('\\"A\\"'), slot3);
      act(() => r.unmount());
    }
  });

  check('a slot has exactly one accessible, clickable element (the drawn Slot inside is neither)', () => {
    const r = render(question);
    const inspect = (when: string) => {
      for (const i of [0, 1, 2]) {
        const stop = byId(r, `match-slot-${i}`);
        const drawn = stop.findAll(n => n.props?.importantForAccessibility === 'no-hide-descendants');
        assert.ok(drawn.length > 0, `${when}: slot ${i} has its drawn part hidden`);
        for (const d of drawn) {
          const bad = d.findAll(
            n => typeof n.props?.onPress === 'function' || n.props?.accessible === true ||
              n.props?.accessibilityRole === 'button' || n.props?.focusable === true,
          );
          assert.equal(bad.length, 0, `${when}: slot ${i} drawn part has a second stop`);
        }
      }
    };
    inspect('empty');
    tap(chipFor(r, 'hat')); tap(byId(r, 'match-slot-0'));
    inspect('filled');
    act(() => r.unmount());
  });

  check('a picture-only prompt is announced', () => {
    const r = render(Q([o('a', '', 'x', { p: { filename: 'p.png', filetype: 6 } }), o('b', 'dog', 'y')]));
    const labels = r.root.findAll(n => n.props?.accessible === true).map(n => n.props.accessibilityLabel);
    assert.ok(labels.includes('corporate.matching.promptPicture{"n":1}'), JSON.stringify(labels));
    act(() => r.unmount());
  });

  check('a drag ends where the same taps end (place, swap, take back, drop nowhere)', () => {
    const labelsOf = (r: ReactTestRenderer) =>
      [0, 1, 2].map(i => byId(r, `match-slot-${i}`).props.accessibilityLabel as string);
    // Taps.
    reports.length = 0;
    const rt = render(question);
    tap(chipFor(rt, 'hat')); tap(byId(rt, 'match-slot-1'));           // hat -> dog
    tap(chipFor(rt, 'log')); tap(byId(rt, 'match-slot-0'));           // log -> cat
    // swap the two placed chips: slot 1 back, hat to slot 0 (log back), log to slot 1
    tap(byId(rt, 'match-slot-1')); tap(chipFor(rt, 'hat')); tap(byId(rt, 'match-slot-0'));
    tap(chipFor(rt, 'log')); tap(byId(rt, 'match-slot-1'));
    tap(chipFor(rt, 'run')); tap(byId(rt, 'match-slot-2'));           // run -> sun
    tap(byId(rt, 'match-slot-2'));                                    // take run back
    const tapLabels = labelsOf(rt);
    const tapReady = reports[reports.length - 1].ready;
    const tapEval = reports[reports.length - 1].evaluate();
    act(() => rt.unmount());
    // The same through drops.
    reports.length = 0;
    const rd = render(question);
    const drop = (id: string, target: string | null) => act(() => drag.opts.onDrop(id, target));
    drop('bank:a', 'slot:b');
    drop('bank:b', 'slot:a');
    drop('slot:b', 'slot:a');      // hat onto log's slot: they swap
    drop('slot:a', null);          // dropped nowhere: nothing moves
    drop('bank:c', 'bank');        // a bank chip back onto the bank: nothing
    drop('bank:c', 'slot:c');
    drop('slot:c', 'bank');        // dragged back to the bank
    assert.deepEqual(labelsOf(rd), tapLabels);
    assert.equal(reports[reports.length - 1].ready, tapReady);
    assert.deepEqual(reports[reports.length - 1].evaluate(), tapEval);
    assert.equal(tapLabels[0], 'corporate.matching.slotFilled{"prompt":"cat","answer":"hat"}');
    assert.equal(tapLabels[1], 'corporate.matching.slotFilled{"prompt":"dog","answer":"log"}');
    act(() => rd.unmount());
  });

  check('a hold that never moved is a tap on what was held', () => {
    const r = render(question);
    act(() => drag.opts.onHoldTap('bank:a'));
    assert.equal(byId(r, 'match-slot-1').props.accessibilityLabel, 'corporate.matching.slotTarget{"prompt":"dog","chip":"hat"}');
    act(() => drag.opts.onHoldTap('slot:a'));
    assert.equal(byId(r, 'match-slot-0').props.accessibilityLabel, 'corporate.matching.slotFilled{"prompt":"cat","answer":"hat"}');
    act(() => r.unmount());
  });

  check('drag is offered only where it works: free bank chips and filled slots, never once locked', () => {
    drag.draggables = {};
    const r = render(question);
    tap(chipFor(r, 'hat')); tap(byId(r, 'match-slot-0'));
    assert.equal(drag.draggables['slot:a'], true, 'a filled slot drags');
    assert.equal(drag.draggables['slot:b'], false, 'an empty slot does not');
    assert.equal(drag.draggables['bank:b'], true, 'a free chip drags');
    assert.equal(drag.draggables['bank:a'], false, 'a used chip (ghost) does not');
    assert.equal(drag.opts.enabled, true);
    // Submitted: marks are in. No drag anywhere, and the bank (and its grips) are gone.
    drag.draggables = {};
    act(() => r.update(h(MatchingBody, {
      question, mode: 'practice', tries: 1, resetKey: 0, resultState: 'incorrect',
      disabled: false, marks: { a: 'correct' }, showAnswer: false, report,
    })));
    assert.equal(drag.opts.enabled, false);
    assert.ok(Object.values(drag.draggables).every(v => v === false), JSON.stringify(drag.draggables));
    assert.equal(r.root.findAll(n => typeof n.props?.testID === 'string' && n.props.testID.startsWith('match-chip-')).length, 0);
    act(() => r.unmount());
  });

  console.log(`matchingRender: ${passed} checks passed`);
}
main();
