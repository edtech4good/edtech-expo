/**
 * The migrated audio buttons share one player: the kids question heading,
 * a kids MCQ option, a matching associate and a matching drop option all
 * play through the kit's audioManager, so starting one stops the other and
 * two clips never play at once. Also covers the matching associate button
 * that used to do nothing (it checked the option's file, not its own).
 *
 * Plain script run by `tsx` (package.json `test:shell`). Renders with
 * react-test-renderer over react-native-web (see nativeStubs.ts), with a
 * fake expo-av Sound that records what is loaded and unloaded. Exits
 * non-zero on the first failed check.
 */
import './nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

// ---------------------------------------------------------------------------
// Extra redirects for these components, on top of nativeStubs: a recording
// expo-av, a theme switch for useDesign, the '@/components' barrel and
// reanimated (imported by the corporate branch, never rendered here).
// ---------------------------------------------------------------------------
interface FakeSound {
  id: number;
  loaded: boolean;
  playing: boolean;
  unloads: number;
  source: unknown;
}
const sounds: FakeSound[] = [];
class RecordingSound {
  rec: FakeSound;
  cb: ((s: unknown) => void) | null = null;
  constructor() {
    this.rec = { id: sounds.length, loaded: false, playing: false, unloads: 0, source: null };
    sounds.push(this.rec);
  }
  async loadAsync(source: unknown, status?: { shouldPlay?: boolean }) {
    this.rec.loaded = true;
    this.rec.source = source;
    this.rec.playing = !!status?.shouldPlay;
    return {};
  }
  async unloadAsync() {
    this.rec.loaded = false;
    this.rec.playing = false;
    this.rec.unloads++;
    return {};
  }
  async pauseAsync() {
    this.rec.playing = false;
    return {};
  }
  async playAsync() {
    this.rec.playing = true;
    return {};
  }
  async playFromPositionAsync() {
    // The old players called this; nothing migrated should.
    throw new Error('a component still plays its own Audio.Sound');
  }
  setOnPlaybackStatusUpdate(cb: ((s: unknown) => void) | null) {
    this.cb = cb;
  }
}
const playing = () => sounds.filter(s => s.loaded && s.playing);

const h = React.createElement;
let corporate = false;
const extra: Record<string, unknown> = {
  'expo-av': { __esModule: true, Audio: { Sound: RecordingSound } },
  '@/services': {
    __esModule: true,
    useFont: () => 'NotoSansKhmer',
    useResource: ({ name }: { name: string }) => (name ? `https://media.test/${name}` : ''),
    useBreakpoint: (o: { mobile: unknown }) => o.mobile,
    useDesign: () => ({ design: corporate ? 'corporate' : 'kids', isCorporate: corporate }),
  },
  'react-native-reanimated': {
    __esModule: true,
    default: { View: (p: any) => h('div', p) },
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
  },
  '@/components': new Proxy(
    { __esModule: true },
    {
      get: (t: any, k: string) => {
        if (k in t) return t[k];
        const RN = require('react-native-web');
        if (k === 'IconButton')
          return (p: any) => h(RN.Pressable, { onPress: p.onPress, testID: `icon-${p.icon}` });
        if (k === 'H4') return (p: any) => h(RN.Text, null, p.children);
        // Layout pieces: Expanded, SizedBox.Large, ...
        const Box: any = (p: any) => h(RN.View, null, p.children);
        // SizedBox.Large and friends: capitalised members are boxes too.
        return new Proxy(Box, {
          get: (b, kk) => (typeof kk === 'string' && /^[A-Z][a-z]/.test(kk) && kk !== 'PropTypes' ? Box : b[kk]),
        });
      },
    },
  ),
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request in extra) return extra[request];
  if (request === 'styled-components/native') {
    // nativeStubs' theme is the corporate tokens; the kids buttons also read
    // the shared font sizes.
    const base = load.call(this, request, ...rest);
    const theme = { ...base.useTheme(), fontSizes: { h1: 32, h3: 24, h4: 20, subtitle: 18 } };
    return { ...base, useTheme: () => theme };
  }
  if (/(^|\/)texts\/H3$/.test(request))
    return {
      __esModule: true,
      default: (p: any) => h(require('react-native-web').Text, null, p.children),
    };
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';

let passed = 0;
async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const settle = (): Promise<void> => new Promise<void>(r => setTimeout(r, 0));
async function press(node: TestRenderer.ReactTestInstance) {
  await act(async () => {
    node.props.onPress({});
    await settle();
  });
}
function render(el: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const pressables = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.type !== 'string' && typeof n.props?.onPress === 'function');

async function main() {
  const PracticeHeading = require('../PracticeHeading').default;
  const MCQTextItem = require('../MCQTextItem').default;
  const DragItem = require('../DragItem').default;
  const DropItem = require('../DropItem').default;

  const heading = {
    headingtext: 'Listen and choose',
    headingfile: { filename: 'heading.wav', filetype: 3 },
  };

  await check('kids heading then kids option: only one plays; the heading clip is unloaded', async () => {
    sounds.length = 0;
    const r = render(
      h(React.Fragment, null,
        h(PracticeHeading, { heading }),
        h(MCQTextItem, { text: 'Option', audioUrl: 'option.wav', isCorrect: true }),
      ),
    );
    assert.equal(sounds.length, 0, 'nothing loads before a tap (no Sound per render any more)');
    const [headingBtn] = pressables(r);
    const optionBtn = r.root.find(n => n.props?.testID === 'icon-play-circle');
    await press(headingBtn);
    assert.equal(playing().length, 1);
    assert.deepEqual(playing()[0].source, { uri: 'https://media.test/heading.wav' });
    await press(optionBtn);
    assert.equal(playing().length, 1, 'two clips playing at once');
    assert.deepEqual(playing()[0].source, { uri: 'https://media.test/option.wav' });
    assert.equal(sounds[0].unloads, 1, 'the heading clip was unloaded');
    // Re-rendering the option does not create or load anything.
    act(() => r.update(h(MCQTextItem, { text: 'Option', audioUrl: 'option.wav', isCorrect: true, isSelected: true })));
    assert.equal(sounds.length, 2);
    act(() => r.unmount());
    await act(settle);
    assert.equal(playing().length, 0, 'unmounting stops the clip');
  });

  await check('matching: an associate with audio (and an option without) plays; the drop option then stops it', async () => {
    sounds.length = 0;
    const option = {
      questionoptionid: 'o1',
      questionoptiontext: 'Cat',
      questionoptionfile: { filename: 'cat.wav', filetype: 3 },
      questionassociate: { questionassociatetext: 'Meow', questionassociatefile: { filename: 'meow.wav', filetype: 3 } },
    };
    const associateOnly = { ...option, questionoptionfile: null };
    // The item's own tap handler (select / drop): not a sound button.
    const itemPress = () => undefined;
    const drag = render(h(DragItem, { option: associateOnly, onPress: itemPress }));
    const drop = render(h(DropItem, { option, onPress: itemPress }));
    // A sound button: a pressable of the component's own (not the item's
    // select/drop handler) wrapping only the sound picture.
    const soundButtons = (r: ReactTestRenderer) =>
      pressables(r).filter(
        n => n.props.onPress !== itemPress && n.findAll(c => c.type === 'img').length === 1,
      );
    const [assocBtn] = soundButtons(drag);
    assert.ok(assocBtn, 'the associate sound button renders');
    await press(assocBtn);
    assert.equal(playing().length, 1, 'the associate button plays (it used to do nothing)');
    assert.deepEqual(playing()[0].source, { uri: 'https://media.test/meow.wav' });
    const [dropBtn] = soundButtons(drop);
    assert.ok(dropBtn, 'the drop option sound button renders');
    await press(dropBtn);
    assert.equal(playing().length, 1, 'two clips playing at once');
    assert.deepEqual(playing()[0].source, { uri: 'https://media.test/cat.wav' });
    act(() => drag.unmount());
    act(() => drop.unmount());
    await act(settle);
    assert.equal(playing().length, 0, 'unmounting stops the clip');
  });

  console.log(`audioOnePlayer: ${passed} checks passed`);
  // Animated timers from DragItem keep node alive.
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
