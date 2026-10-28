/**
 * Bilingual content, rendered: the corporate multiple choice (McqTextBody)
 * over the question as the practice hook hands it on, i.e. the REAL overlay
 * (transforms/Content, as usePractice applies it) of the interface language
 * over the raw row the student API sends.
 *
 * Options are shuffled per attempt, so every assertion is by option id: the
 * label an option shows is checked by choosing it and reading the id the
 * body grades, never by position. Also proves the typography follows the
 * text: a base English option in a Khmer interface is set in the Latin face,
 * a Khmer translation in an English interface in the Khmer one.
 *
 * Plain script run by `tsx` (package.json `test:content`). Renders with
 * react-test-renderer over react-native-web (see nativeStubs.ts). The Khmer
 * text is an opaque run of code points of the Khmer block. Exits non-zero on
 * the first failed check.
 */
import '../../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

const h = React.createElement;
let language: 'en' | 'km' = 'km';
const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}${JSON.stringify(o)}` : key);
const extra: Record<string, unknown> = {
  'react-i18next': { __esModule: true, useTranslation: () => ({ t }) },
  // The real useFont, over a store that only knows the interface language.
  '@/redux': { __esModule: true, useAppSelector: (select: (s: unknown) => unknown) => select({ setting: { language } }) },
  '@/redux/slices': { __esModule: true, getSelectedLanguage: (s: { setting: { language: string } }) => s.setting.language },
  'react-native-reanimated': {
    __esModule: true,
    default: { View: (p: any) => h('div', p, p.children) },
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
  },
  '@/components/kit/audio/useReplayClip': { __esModule: true, useReplayClip: () => ({ play: async () => undefined }) },
  '@/components/practices/PracticeFile': { __esModule: true, default: () => h('div') },
  '@/components/layouts/ExpandedWithLayout': { __esModule: true, default: (p: any) => h('div', null, p.children) },
  'expo-av': { __esModule: true, Audio: { Sound: class { unloadAsync = async () => undefined; loadAsync = async () => undefined; } } },
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request === '@/services')
    return {
      __esModule: true,
      useFont: require('../../../../services/hooks/useFont').default,
      useResource: ({ name }: { name: string }) => (name ? `https://media.test/${name}` : ''),
      useBreakpoint: (o: { mobile: unknown }) => o.mobile,
    };
  if (request in extra) return extra[request];
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';
// eslint-disable-next-line import/first
import { overlayQuestionRows } from '../../../../transforms/Content';
// eslint-disable-next-line import/first
import { CHOICE_KM, choiceQuestion, KM, OPT_A, OPT_B, OPT_C } from '../../../../transforms/__tests__/contentFixtures';

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

const KHMER_FACE = 'NotoSansKhmerSemiBold';
const LATIN_FACE = 'PlusJakartaSansSemiBold';

function main() {
  const McqTextBody = require('../McqTextBody').default;
  const reports: Array<{ ready: boolean; evaluate: () => any }> = [];
  const report = (r: any) => reports.push(r);
  const last = () => reports[reports.length - 1];

  /** What usePractice hands the screen: the overlay of `language` over the raw row. */
  const shown = (raw: any, lang: 'en' | 'km') => overlayQuestionRows([{ question: raw } as any], lang)[0].question;
  const props = (question: any, tries = 1) => ({
    question, mode: 'practice', tries, resetKey: 0, resultState: 'answering',
    disabled: false, marks: null, showAnswer: false, report, layout: null,
  });
  const render = (question: any) => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(h(McqTextBody, props(question)));
    });
    return r;
  };
  const options = (r: ReactTestRenderer) =>
    r.root.findAll(
      n => typeof n.props?.testID === 'string' && /^answer-option-\d+$/.test(n.props.testID) && typeof n.props.onPress === 'function',
      { deep: false },
    );
  const labels = (r: ReactTestRenderer) => options(r).map(n => n.props.accessibilityLabel as string);
  /** The face the label text is set in. */
  const face = (r: ReactTestRenderer, label: string): string => {
    const text = r.root.findAll(n => n.props?.children === label && n.props?.style && !Array.isArray(n.props.style) && 'fontFamily' in n.props.style)[0];
    assert.ok(text, `a text for ${label}`);
    return text.props.style.fontFamily;
  };
  /** Choose the option showing `label`; returns the id the body graded. */
  const idOf = (r: ReactTestRenderer, label: string): string => {
    const node = options(r).find(n => n.props.accessibilityLabel === label);
    assert.ok(node, `an option showing ${label}`);
    act(() => node!.props.onPress());
    const perItem = last().evaluate().perItem as Record<string, string>;
    act(() => node!.props.onPress()); // unselect
    const ids = Object.keys(perItem);
    assert.equal(ids.length, 1);
    return ids[0];
  };

  check('a Khmer interface: each option shows its own translation, found by id; untranslated options keep the base text', () => {
    language = 'km';
    const r = render(shown(choiceQuestion(1, CHOICE_KM), 'km'));
    assert.deepEqual([...labels(r)].sort(), [KM(13), KM(14), '7'].sort());
    assert.equal(idOf(r, KM(13)), OPT_B);
    assert.equal(idOf(r, KM(14)), OPT_C);
    assert.equal(idOf(r, '7'), OPT_A);
    act(() => r.unmount());
  });

  check('the same raw row in an English interface shows the base text for every option', () => {
    language = 'en';
    const r = render(shown(choiceQuestion(1, CHOICE_KM), 'en'));
    assert.deepEqual([...labels(r)].sort(), ['12', '7', '9']);
    assert.equal(idOf(r, '12'), OPT_B);
    act(() => r.unmount());
  });

  check('shuffling does not move a translation to another option: every attempt keeps label and id together', () => {
    language = 'km';
    const raw = choiceQuestion(1, CHOICE_KM);
    const question = shown(raw, 'km');
    const seen = new Set<string>();
    for (let tries = 1; tries <= 12; tries += 1) {
      let r!: ReactTestRenderer;
      act(() => {
        r = TestRenderer.create(h(McqTextBody, props(question, tries)));
      });
      seen.add(labels(r).join('|'));
      assert.equal(idOf(r, KM(13)), OPT_B);
      assert.equal(idOf(r, KM(14)), OPT_C);
      assert.equal(idOf(r, '7'), OPT_A);
      act(() => r.unmount());
    }
    assert.ok(seen.size > 1, 'the options really were shuffled between attempts');
  });

  check('typography follows the text: base English in a Khmer interface is set in the Latin face, the translations in the Khmer face', () => {
    language = 'km';
    const r = render(shown(choiceQuestion(1, CHOICE_KM), 'km'));
    assert.equal(face(r, '7'), LATIN_FACE, 'the fallback is English text');
    assert.equal(face(r, KM(13)), KHMER_FACE);
    assert.equal(face(r, KM(14)), KHMER_FACE);
    act(() => r.unmount());
  });

  check('a Khmer base text (a Khmer-language organisation) in an English interface is set in the Khmer face', () => {
    language = 'en';
    const raw: any = choiceQuestion(1, { headingtext: KM(40) });
    raw.contentlanguage = 'km';
    raw.questionobject.questionoptions[0].questionoptiontext = KM(41); // the author wrote the options in Khmer
    raw.questionoptions[0].questionoptiontext = KM(41);
    const r = render(shown(raw, 'en'));
    assert.equal(face(r, KM(41)), KHMER_FACE);
    assert.equal(face(r, '12'), KHMER_FACE, 'the whole row is in the organisation\'s language, so its other options follow');
    act(() => r.unmount());
  });

  check('a question from an older server or cache (no translations, no content language) renders as before, in the interface face', () => {
    language = 'km';
    const r = render(shown(choiceQuestion(1), 'km'));
    assert.deepEqual([...labels(r)].sort(), ['12', '7', '9']);
    assert.equal(face(r, '12'), KHMER_FACE, 'the language of the text is unknown: the interface decides');
    act(() => r.unmount());
  });

  check('switching the interface language re-renders the same raw row in the other language, with no new data', () => {
    language = 'km';
    const raw = choiceQuestion(1, CHOICE_KM);
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(h(McqTextBody, props(shown(raw, 'km'))));
    });
    assert.ok(labels(r).includes(KM(13)));
    language = 'en';
    act(() => r.update(h(McqTextBody, props(shown(raw, 'en')))));
    assert.deepEqual([...labels(r)].sort(), ['12', '7', '9']);
    assert.equal(idOf(r, '12'), OPT_B);
    act(() => r.unmount());
  });

  console.log(`mcqTextRender: ${passed} checks passed`);
}

main();
