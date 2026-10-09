/**
 * QuizIntro rendered (react-test-renderer over react-native-web, see
 * src/components/practices/__tests__/nativeStubs.ts): the card shows the quiz
 * name, a plural-aware "N questions · scored" line (blank until loaded), an
 * idle mascot, and a Start button that is busy while the questions load and
 * calls onStart once they have. Compact (short) screens get the compact mascot.
 *
 * Plain script run by `tsx` (package.json `test:quizintro`).
 */
import '../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

const h = React.createElement;
const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}${JSON.stringify(o)}` : key);
const mascots: any[] = [];
const buttons: any[] = [];
const extra: Record<string, unknown> = {
  'react-i18next': { __esModule: true, useTranslation: () => ({ t }) },
  '@/components': {
    __esModule: true,
    AppButton: (p: any) => {
      buttons.push(p);
      return h('Text', { testID: p.testID, accessibilityLabel: p.accessibilityLabel }, p.label);
    },
  },
  '@/components/kit': { __esModule: true, QuestionColumn: (p: any) => h('View', null, p.children) },
  '@/components/mascot': {
    __esModule: true,
    Mascot: (p: any) => {
      mascots.push(p);
      return h('Text', { testID: 'mascot' }, `mascot:${p.clip}`);
    },
  },
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request in extra) return extra[request];
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Dimensions } = require('react-native-web');

const QuizIntro = require('../QuizIntro').default;
const text = (r: ReactTestRenderer) => JSON.stringify(r.toJSON());
const render = (props: Record<string, unknown>) => {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(h(QuizIntro, { title: 'Unit 1 Quiz', onStart: () => {}, ...props }));
  });
  return r;
};
let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}
const last = <T,>(a: T[]) => a[a.length - 1];

Dimensions.set({ window: { width: 390, height: 812, scale: 1, fontScale: 1 } });

check('shows the quiz name, the scored count, an idle mascot and Start', () => {
  mascots.length = 0;
  const r = render({ questionCount: 8, loading: false });
  const s = text(r);
  assert.ok(s.includes('Unit 1 Quiz'));
  assert.ok(s.includes('screen.lesson.quizQuestions{\\"count\\":8}'), 'plural-aware scored key with the count');
  assert.equal(last(mascots).clip, 'idle');
  assert.equal(last(mascots).compact, undefined, 'regular size on a phone');
  assert.equal(last(buttons).label, 'cta.start');
  assert.equal(last(buttons).accessibilityLabel, 'corporate.quizIntro.startQuiz');
  assert.equal(last(buttons).loading, false);
  assert.equal(last(buttons).fullWidth, true);
});

check('while loading: no count, Start is busy; Start is wired to onStart', () => {
  let started = 0;
  const r = render({ questionCount: null, loading: true, onStart: () => started++ });
  assert.ok(!text(r).includes('quizQuestions'), 'no count until the questions are known');
  assert.equal(last(buttons).loading, true);
  act(() => last(buttons).onPress());
  assert.equal(started, 1, 'the screen decides what a press does; the button just reports it');
});

check('no questions loaded (0): no count line', () => {
  const r = render({ questionCount: 0, loading: false });
  assert.ok(!text(r).includes('quizQuestions'));
});

check('short landscape screens get the compact mascot', () => {
  Dimensions.set({ window: { width: 812, height: 375, scale: 1, fontScale: 1 } });
  mascots.length = 0;
  render({ questionCount: 8, loading: false });
  assert.equal(last(mascots).compact, true);
  Dimensions.set({ window: { width: 390, height: 812, scale: 1, fontScale: 1 } });
});
console.log(`${passed} checks passed`);
