/**
 * LessonScreen's wiring (edtech-expo#143), rendered with react-test-renderer
 * over stand-ins for the player, the bar, the store and the hooks it reads:
 *  - a loaded status sets "everLoaded", and onError then posts nothing; an item
 *    that never loaded still posts the one-shot no-media completion;
 *  - the lesson is flagged mounted while open and the full-screen flag is
 *    cleared on unmount (useFullScreenCleanup is called);
 *  - after the full-screen switch a "loaded, no duration" status is ignored,
 *    and leaving saves the last good position with a numeric duration.
 * Plain script run by `tsx` (package.json `test:fullscreen`).
 */
import '../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

const h = React.createElement;
const RN = require('react-native-web');
const Pass = (p: any) => h(RN.View, null, p.children);

let videoProps: any = null;
let barProps: any = null;
const saves: unknown[][] = [];
let liveStatus: any = { isLoaded: true, positionMillis: 7000, durationMillis: 20000, isPlaying: false };

const Video = React.forwardRef((props: any, ref: any) => {
  videoProps = props;
  React.useImperativeHandle(ref, () => ({
    getStatusAsync: async () => liveStatus,
    setPositionAsync: async () => liveStatus,
    playAsync: async () => liveStatus,
    pauseAsync: async () => liveStatus,
    replayAsync: async () => liveStatus,
    setVolumeAsync: async () => liveStatus,
  }));
  return null;
});

const selected = { lessonlearningid: 'L1', lessonlearningname: 'A video' };
const extra: Record<string, unknown> = {
  'expo-av': { __esModule: true, Video, ResizeMode: { CONTAIN: 'contain' } },
  '@/components/kit/audio/audioManager': { audioManager: { stop: async () => undefined } },
  '@/components': { __esModule: true, BlackVeil: Pass, Expanded: Pass, LayoutScrollView: Pass },
  '@react-navigation/elements': { __esModule: true, useHeaderHeight: () => 0 },
  'styled-components/native': {
    __esModule: true,
    useTheme: () => ({ colors: { background: '#fff' } }),
  },
  './components/VideoControl': { __esModule: true, default: (p: any) => { barProps = p; return null; } },
  './components/ResumeVideoPopUp': { __esModule: true, default: () => null },
  './components/UnsupportedItemNotice': { __esModule: true, default: () => null },
  'expo-router': { __esModule: true, router: { back: () => undefined }, useNavigation: () => ({ setOptions: () => undefined }) },
  '@/redux': { __esModule: true, useAppSelector: (sel: any) => sel({}) },
  '@/redux/slices': { __esModule: true, getSelectedModule: () => selected },
  '@/constants/LearningItems': { __esModule: true, isLearningItemSupported: () => true },
  '@/models': { __esModule: true },
  'expo-status-bar': { __esModule: true, StatusBar: () => null },
  '@/services': {
    __esModule: true,
    OfflineBannerHeightContext: React.createContext(0),
    useLearning: () => ({
      fetch: () => undefined,
      source: 'http://media.test/clip.mp4',
      progress: 0,
      saveProgress: async (...a: unknown[]) => { saves.push(a); },
      learningResource: { lessonlearningid: 'L1' },
      loaded: true,
      clear: async () => undefined,
    }),
    useSetting: () => ({}),
    useDesign: () => ({ isCorporate: false }),
    setVideoFullScreen: (v: boolean) => require('../../../services/videoFullScreen').setVideoFullScreen(v),
  },
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request in extra) return extra[request];
  if (request === 'react-native') {
    const rn = load.call(this, request, ...rest);
    // RNW's Modal needs a DOM; a pass-through that renders its children is enough here.
    return new Proxy(rn, { get: (t, k) => (k === 'Modal' ? (p: any) => (p.visible ? h(RN.View, null, p.children) : null) : t[k]) });
  }
  return load.call(this, request, ...rest);
};
// eslint-disable-next-line import/first
import TestRenderer, { act } from 'react-test-renderer';

const LessonScreen = require('../LessonScreen').default;
const { isVideoFullScreen } = require('../../../services/videoFullScreen');
const { isLessonMounted } = require('../../../services/lessonMounted');

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}
const mount = async () => {
  saves.length = 0;
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(h(LessonScreen)); });
  return r;
};
const status = (s: any) => act(async () => { videoProps.onPlaybackStatusUpdate(s); });

(async () => {
  await check('an item that never loaded: onError posts the one-shot no-media completion', async () => {
    const r = await mount();
    await act(async () => { videoProps.onError('boom'); videoProps.onError('boom'); });
    assert.deepEqual(saves, [[0, true, 0]]);
    await act(async () => { r.unmount(); });
  });

  await check('a player that loaded real media: onError posts nothing', async () => {
    const r = await mount();
    await status({ isLoaded: true, positionMillis: 1000, durationMillis: 20000, isPlaying: true });
    await act(async () => { videoProps.onError('network'); });
    assert.deepEqual(saves, []);
    await act(async () => { r.unmount(); });
  });

  await check('a "loaded" status with no duration (the web before any data) does not count as loaded', async () => {
    const r = await mount();
    await status({ isLoaded: true, positionMillis: 0, durationMillis: NaN, isPlaying: false });
    await act(async () => { videoProps.onError('boom'); });
    assert.deepEqual(saves, [[0, true, 0]]);
    await act(async () => { r.unmount(); });
  });

  await check('the lesson is flagged mounted while open; unmounting in full screen clears both flags', async () => {
    const r = await mount();
    assert.equal(isLessonMounted(), true);
    await act(async () => { barProps.onFullScreenPress(); await Promise.resolve(); await Promise.resolve(); });
    assert.equal(isVideoFullScreen(), true);
    await act(async () => { r.unmount(); });
    assert.equal(isVideoFullScreen(), false);
    assert.equal(isLessonMounted(), false);
  });

  await check('after the full-screen switch a no-duration status is ignored, and leaving saves a numeric duration', async () => {
    liveStatus = { isLoaded: true, positionMillis: 7000, durationMillis: 20000, isPlaying: false };
    const r = await mount();
    await status(liveStatus);
    await act(async () => { barProps.onFullScreenPress(); await Promise.resolve(); await Promise.resolve(); });
    // the remounted player after a network drop: loaded, but no duration, position 0
    await status({ isLoaded: true, positionMillis: 0, durationMillis: NaN, isPlaying: false });
    await act(async () => { r.unmount(); });
    await new Promise(res => setTimeout(res, 20));
    assert.deepEqual(saves, [[7000, false, 20000]]);
  });

  console.log(`${passed} checks passed`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
