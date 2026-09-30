/**
 * ImageOrderingBody rendered (react-test-renderer over react-native-web, see
 * src/components/practices/__tests__/nativeStubs.ts) with a stand-in for the
 * drag list that records the props it is given. It proves the wiring the pure
 * tests cannot: what is graded is the LEARNER's order (not the starting one),
 * the marks reach a screen reader, a reloaded question gets a fresh list, the
 * body is hidden until the shell has measured, and the hint's rules.
 *
 * Plain script run by `tsx` (package.json `test:image-ordering`).
 */
import '../../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

const h = React.createElement;
const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}${JSON.stringify(o)}` : key);
let list: any = null; // the props the body gave the drag list (last render)
let listKeys: unknown[] = [];
const extra: Record<string, unknown> = {
  'react-i18next': { __esModule: true, useTranslation: () => ({ t }) },
  '@/redux': { __esModule: true, useAppSelector: () => 'en' },
  '@/redux/slices': { __esModule: true, getSelectedLanguage: () => 'en' },
  '@/components/drag': {
    __esModule: true,
    GripGlyph: () => h('span'),
    ReorderableList: (p: any) => {
      list = p;
      return h('div', { 'data-list': true });
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
const o = (id: string, text: string, seq: number) => ({
  questionoptionid: id,
  questionoptiontext: text,
  questionoptionsequence: seq,
  questionoptionfile: null,
});
const LAYOUT = { availableWidth: 335, availableHeight: 500, compact: false };

function main() {
  const Body = require('../ImageOrdering/ImageOrderingBody').default;
  let reports: Array<{ ready: boolean; evaluate: () => any }> = [];
  const report = (r: any) => reports.push(r);
  const base = (question: unknown, over: Record<string, unknown> = {}) => ({
    question, mode: 'practice', tries: 1, resetKey: 0, resultState: 'answering',
    disabled: false, marks: null, showAnswer: false, layout: LAYOUT, report, ...over,
  });
  const mount = (props: any) => {
    let r!: ReactTestRenderer;
    reports = [];
    act(() => { r = TestRenderer.create(h(Body, props)); });
    return r;
  };
  const update = (r: ReactTestRenderer, props: any) => act(() => r.update(h(Body, props)));
  const evaluate = () => reports[reports.length - 1].evaluate();
  const hint = (r: ReactTestRenderer) => r.root.findAll(n => n.props?.testID === 'image-ordering-hint');

  const question = Q([o('a', 'Wake up', 1), o('b', 'Eat', 2), o('c', 'Work', 3)]);

  check('what is graded is the learner\'s order: dragging changes iscorrect and the answer sent', () => {
    const r = mount(base(question));
    assert.equal(reports[reports.length - 1].ready, true, 'always ready');
    act(() => list.onOrderChange(['c', 'b', 'a']));
    let e = evaluate();
    assert.equal(e.iscorrect, false);
    assert.deepEqual(e.answer, { v: 1, type: 'order', order: ['c', 'b', 'a'] });
    act(() => list.onOrderChange(['a', 'b', 'c']));
    e = evaluate();
    assert.equal(e.iscorrect, true);
    assert.deepEqual(e.answer, { v: 1, type: 'order', order: ['a', 'b', 'c'] });
    act(() => r.unmount());
  });

  check('an untouched order is graded as the starting order, and that never starts correct', () => {
    for (let i = 0; i < 40; i++) {
      const r = mount(base(question));
      assert.equal(evaluate().iscorrect, false);
      assert.deepEqual(list.items.map((x: any) => x.id).sort(), ['a', 'b', 'c']);
      act(() => r.unmount());
    }
  });

  check('a new attempt (Try again) reshuffles and forgets the learner\'s order', () => {
    const r = mount(base(question));
    act(() => list.onOrderChange(['a', 'b', 'c']));
    assert.equal(evaluate().iscorrect, true);
    update(r, base(question, { tries: 2, resetKey: 1 }));
    assert.equal(evaluate().iscorrect, false, 'starts wrong again, not the old correct order');
    act(() => r.unmount());
  });

  check('marks reach a screen reader: correct / incorrect after Submit, correct on Show answer, none while answering', () => {
    const r = mount(base(question));
    assert.equal(list.itemStatusFor(list.items[0]), undefined);
    update(r, base(question, { disabled: true, resultState: 'incorrect', marks: { a: 'correct', b: 'incorrect', c: 'incorrect' } }));
    const byId = (x: string) => list.itemStatusFor(list.items.find((i: any) => i.id === x));
    assert.equal(byId('a'), 'kit.mark.correct');
    assert.equal(byId('b'), 'kit.mark.incorrect');
    update(r, base(question, { disabled: true, resultState: 'revealed', showAnswer: true }));
    assert.deepEqual(list.items.map((x: any) => x.id), ['a', 'b', 'c'], 'the correct order');
    assert.equal(list.itemStatusFor(list.items[1]), 'kit.mark.correct');
    act(() => r.unmount());
  });

  check('a reloaded question (new options, same tries) gets a fresh list key', () => {
    const r = mount(base(question));
    const seen = new Set<unknown>();
    // The key is on the element the body creates for the list; read it from the fiber.
    const fiberKey = () => {
      const inst = r.root.findAll(n => typeof n.type === 'function' && n.props?.testID === 'image-ordering-grid')[0] as any;
      return inst?._fiber?.key;
    };
    seen.add(fiberKey());
    update(r, base(Q([o('a', 'Wake up', 1), o('b', 'Eat', 2), o('c', 'Work', 3)])));
    seen.add(fiberKey());
    update(r, base(question, { tries: 2 }));
    seen.add(fiberKey());
    assert.equal(seen.size, 3, `keys ${[...seen]}`);
    act(() => r.unmount());
  });

  check('hidden (opacity 0) until the shell has measured, then shown', () => {
    const r = mount(base(question, { layout: null }));
    const root = () => r.root.findAll(n => n.props?.style && [].concat(n.props.style as any).flat().some((s: any) => s && 'opacity' in s))[0];
    const op = () => ([] as any[]).concat(root().props.style).flat().find((s: any) => s && 'opacity' in s).opacity;
    assert.equal(op(), 0);
    update(r, base(question));
    assert.equal(op(), 1);
    act(() => r.unmount());
  });

  check('the hint shows while answering, and not compact, after Submit or Show answer; it is not a live region', () => {
    const r = mount(base(question));
    assert.equal(hint(r).length, 1);
    assert.equal(r.root.findAll(n => !!n.props?.accessibilityLiveRegion).length, 0, 'the list announces; the line must not repeat it');
    update(r, base(question, { layout: { ...LAYOUT, compact: true } }));
    assert.equal(hint(r).length, 0, 'compact');
    update(r, base(question, { disabled: true, resultState: 'correct', marks: {} }));
    assert.equal(hint(r).length, 0, 'after Submit');
    update(r, base(question, { disabled: true, resultState: 'revealed', showAnswer: true }));
    assert.equal(hint(r).length, 0, 'after Show answer');
    act(() => r.unmount());
  });

  check('the picture size and gap come from the measured layout the shell gives', () => {
    const height = (layout: any) => {
      const r = mount(base(question, { layout }));
      const el = list.renderItem(list.items[0], { index: 0, count: 3, picked: false, lifted: false });
      const out = { image: el.props.imageHeight, gap: list.gapX, gapY: list.gapY };
      act(() => r.unmount());
      return out;
    };
    assert.deepEqual(height({ availableWidth: 335, availableHeight: 800, compact: false }), { image: 104, gap: 12, gapY: 12 });
    assert.deepEqual(height({ availableWidth: 760, availableHeight: 800, compact: false }), { image: 128, gap: 16, gapY: 16 });
    // A short screen: the compact floor and gap, a smaller picture than the regular floor allows.
    assert.deepEqual(height({ availableWidth: 760, availableHeight: 60, compact: true }), { image: 52, gap: 10, gapY: 10 });
    // Less room after Submit (the strip): smaller pictures, same layout.
    const roomy = height({ availableWidth: 335, availableHeight: 400, compact: false }).image;
    const after = height({ availableWidth: 335, availableHeight: 400 - 96, compact: false }).image;
    assert.ok(after < roomy, `${after} < ${roomy}`);
  });

  check('compact: the compact tile and the small audio circle, and the list is told its columns; regular is untouched', () => {
    const six = Q(['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ ...o(id, id, i + 1), questionoptionfile: { filename: `${id}.wav`, filetype: 1 } })));
    const probe = (layout: any) => {
      const r = mount(base(six, { layout }));
      const tile = list.renderItem(list.items[0], { index: 0, count: 6, picked: false, lifted: false });
      // Render the tile itself and read what reached the MovableTile inside it.
      let tr!: ReactTestRenderer;
      act(() => { tr = TestRenderer.create(tile); });
      const movable = tr.root.findAll(n => n.props?.variant === 'image' && 'imageHeight' in n.props)[0];
      const out = { columns: list.columns, compact: movable.props.compact, accessory: list.renderAccessory(list.items[0]).props.compact };
      act(() => { tr.unmount(); r.unmount(); });
      return out;
    };
    assert.deepEqual(probe({ availableWidth: 684, availableHeight: 150, compact: true }), { columns: 6, compact: true, accessory: true });
    assert.deepEqual(probe({ availableWidth: 335, availableHeight: 800, compact: false }), { columns: undefined, compact: false, accessory: false });
    assert.deepEqual(probe({ availableWidth: 760, availableHeight: 800, compact: false }), { columns: undefined, compact: false, accessory: false });
  });

  check('a picture with no text gets a letter label that follows the starting order, not the answer', () => {
    const realRandom = Math.random;
    let seed = 7;
    Math.random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const q = Q([o('a', '', 1), o('b', '  ', 2), o('c', 'Work', 3)]);
    const r = mount(base(q));
    Math.random = realRandom;
    const labels: Record<string, string> = {};
    list.items.forEach((x: any) => { labels[x.id] = x.label; });
    assert.equal(labels.c, 'Work');
    const start = list.items.map((x: any) => x.id);
    const letters = list.items.map((x: any) => x.label);
    // Positional in the STARTING order: A for the first shown, B for the second, C for the third.
    // Positional in the starting order: the nth picture shown is the nth letter (skipping the one with text).
    list.items.forEach((x: any, i: number) => {
      if (x.id !== 'c') assert.equal(x.label, `corporate.imageOrdering.picture{"letter":"${'ABC'[i]}"}`);
    });
    assert.equal(new Set(letters).size, 3);
    // Show answer keeps each picture's letter.
    update(r, base(q, { disabled: true, resultState: 'revealed', showAnswer: true }));
    list.items.forEach((x: any) => assert.equal(x.label, labels[x.id]));
    void start;
    act(() => r.unmount());
  });

  console.log(`imageOrderingRender: ${passed} checks passed`);
}
main();
