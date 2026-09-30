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
const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}${JSON.stringify(o)}` : key);
const extra: Record<string, unknown> = {
  'react-i18next': { __esModule: true, useTranslation: () => ({ t }) },
  '@/redux': { __esModule: true, useAppSelector: () => 'en' },
  '@/redux/slices': { __esModule: true, getSelectedLanguage: () => 'en' },
  // The drag list pulls in gesture-handler; MovableTile only needs its grip glyph.
  '@/components/drag': { __esModule: true, GripGlyph: () => h('span') },
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

  check('a picture-only prompt is announced', () => {
    const r = render(Q([o('a', '', 'x', { p: { filename: 'p.png', filetype: 6 } }), o('b', 'dog', 'y')]));
    const labels = r.root.findAll(n => n.props?.accessible === true).map(n => n.props.accessibilityLabel);
    assert.ok(labels.includes('corporate.matching.promptPicture{"n":1}'), JSON.stringify(labels));
    act(() => r.unmount());
  });

  console.log(`matchingRender: ${passed} checks passed`);
}
main();
