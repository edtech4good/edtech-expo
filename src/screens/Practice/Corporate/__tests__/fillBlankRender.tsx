/**
 * FillBlankBody rendered (react-test-renderer over react-native-web, see
 * src/components/practices/__tests__/nativeStubs.ts), with stand-ins for the
 * drag primitives that hand the test the body's drop handler. It proves the
 * wiring the pure tests cannot: a drop ends where the same taps end (same
 * blanks, same hint, same graded answer), a hold that never moved is a tap,
 * and drag is offered only where it works (free bank words and filled
 * blanks, never once the question is locked).
 *
 * Plain script run by `tsx` (package.json `test:fillblank`). Exits non-zero
 * on the first failed check.
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
      return h('div', null, p.children);
    },
  },
  '@/components/kit/audio/useReplayClip': { __esModule: true, useReplayClip: () => ({ play: async () => undefined }) },
  '@/components/practices/PracticeFile': { __esModule: true, default: () => h('div') },
  '@/components/layouts/ExpandedWithLayout': { __esModule: true, default: (p: any) => h('div', null, p.children) },
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

const opt = (id: string, text: string, seq: number) => ({
  questionoptionid: id,
  questionoptiontext: text,
  questionoptionsequence: seq,
  questionoptioniscorrect: true,
  questionoptionfile: null,
});
const question = {
  questionid: 'q',
  questiontext: 'Profit is ----- minus -----.',
  questionobject: {
    questionoptions: [opt('in', 'income', 1), opt('ex', 'expenses', 2)],
    questiondistractors: [{ questiondistractorid: 'sa', questiondistractortext: 'savings' }],
    questionfile: null,
  },
};

function main() {
  const FillBlankBody = require('../FillBlank/FillBlankBody').default;
  const reports: Array<{ ready: boolean; evaluate: () => any }> = [];
  const report = (r: any) => reports.push(r);
  const props = (over: Record<string, unknown> = {}) => ({
    question, mode: 'practice', tries: 1, resetKey: 0, resultState: 'answering',
    disabled: false, marks: null, showAnswer: false, report, ...over,
  });
  const render = () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(h(FillBlankBody, props()));
    });
    return r;
  };
  const pressable = (r: ReactTestRenderer, id: string) =>
    r.root.findAll(n => n.props?.testID === id && typeof n.props.onPress === 'function')[0];
  const tap = (r: ReactTestRenderer, id: string) => act(() => pressable(r, id).props.onPress({}));
  // The host Pressable (the element with the label), not the Slot component.
  const blanks = (r: ReactTestRenderer) =>
    [0, 1].map(i => {
      const n = r.root.findAll(x => x.props?.testID === `fill-blank-${i}` && typeof x.props.accessibilityLabel === 'string')[0];
      assert.ok(n, `blank ${i} has a labelled element`);
      return n.props.accessibilityLabel as string;
    });
  const hint = (r: ReactTestRenderer) =>
    r.root.findAll(n => n.props?.testID === 'fill-blank-hint' && typeof n.props.children === 'string')[0]?.props.children;
  const last = () => reports[reports.length - 1];

  check('a drag ends where the same taps end (fill, replace, swap, back to the bank, drop nowhere)', () => {
    // Taps: income -> blank 1 (tap blank 1 first), savings -> blank 0,
    // savings out, expenses in, then income and expenses swapped by taps.
    reports.length = 0;
    const rt = render();
    tap(rt, 'fill-blank-1'); tap(rt, 'fill-tile-in');          // [_, income]
    tap(rt, 'fill-tile-sa');                                  // [savings, income]
    tap(rt, 'fill-blank-0'); tap(rt, 'fill-tile-ex');         // [expenses, income]
    tap(rt, 'fill-blank-0'); tap(rt, 'fill-blank-1');         // [_, _] (active 1)
    tap(rt, 'fill-blank-1'); tap(rt, 'fill-tile-ex');         // [_, expenses]
    tap(rt, 'fill-blank-0'); tap(rt, 'fill-tile-in');         // [income, expenses]
    const want = { blanks: blanks(rt), hint: hint(rt), ready: last().ready, ev: last().evaluate() };
    act(() => rt.unmount());

    reports.length = 0;
    const rd = render();
    const drop = (id: string, target: string | null) => act(() => drag.opts.onDrop(id, target));
    drop('bank:in', 'blank:1');
    drop('bank:sa', 'blank:0');
    drop('bank:ex', 'blank:0');        // onto a filled blank: savings back to the bank
    drop('blank:0', null);             // nowhere: nothing moves
    drop('bank:sa', 'bank');           // a bank word onto the bank: nothing
    drop('blank:0', 'blank:1');        // swap: [income, expenses]
    assert.deepEqual(
      { blanks: blanks(rd), hint: hint(rd), ready: last().ready, ev: last().evaluate() },
      want,
    );
    assert.equal(want.ev.iscorrect, true);
    // And back to the bank empties the blank, as tapping it does.
    drop('blank:1', 'bank');
    assert.equal(last().ready, false);
    assert.match(blanks(rd)[1], /a11yActive|a11yEmpty/);
    act(() => rd.unmount());
  });

  check('a hold that never moved is a tap on what was held', () => {
    const r = render();
    act(() => drag.opts.onHoldTap('bank:ex'));
    assert.match(blanks(r)[0], /expenses/);
    act(() => drag.opts.onHoldTap('blank:0'));
    assert.doesNotMatch(blanks(r)[0], /expenses/);
    act(() => r.unmount());
  });

  check('drag is offered only where it works: free bank words and filled blanks, never once locked', () => {
    const r = render();
    drag.draggables = {}; // only what the next render draws
    tap(r, 'fill-tile-in');
    assert.equal(drag.draggables['blank:0'], true, 'a filled blank drags');
    assert.equal(drag.draggables['blank:1'], false, 'an empty blank does not');
    assert.equal(drag.draggables['bank:ex'], true, 'a free word drags');
    assert.equal(drag.draggables['bank:in'], undefined, 'a used word is a ghost with no drag');
    assert.equal(drag.opts.enabled, true);
    drag.draggables = {};
    act(() => r.update(h(FillBlankBody, props({ resultState: 'incorrect', marks: { in: 'correct' } }))));
    assert.equal(drag.opts.enabled, false);
    assert.ok(Object.values(drag.draggables).every(v => v === false), JSON.stringify(drag.draggables));
    act(() => r.unmount());
  });

  console.log(`fillBlankRender: ${passed} checks passed`);
}
main();
