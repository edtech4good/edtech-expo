/**
 * VideoControl's buttons by platform and placement (edtech-expo#143): the
 * full-screen button is in the bar on Android and web and absent on iOS (which
 * keeps native controls); while full screen is open there is no Close (X), only
 * Exit full screen; outside it, Close is there. The real VideoControl and
 * FullScreenButton are rendered with react-test-renderer over react-native-web
 * (see src/components/practices/__tests__/nativeStubs.ts), with the app's
 * component barrel replaced by plain stand-ins.
 *
 * Plain script run by `tsx` (package.json `test:fullscreen`). Exits non-zero
 * on the first failure.
 */
import '../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../locales/en.json'), 'utf8'));
const translate = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), en) ?? key;

const h = React.createElement;
const RN = require('react-native-web');
const Box = (p: any) => h(RN.View, p);
const SizedBox: any = (p: any) => h(RN.View, p);
SizedBox.Large = SizedBox;
SizedBox.Medium = SizedBox;
const extra: Record<string, unknown> = {
  'react-i18next': { __esModule: true, useTranslation: () => ({ t: translate }) },
  '@expo/vector-icons': { __esModule: true, MaterialCommunityIcons: (p: any) => h('icon', p) },
  '@react-native-community/slider': { __esModule: true, default: (p: any) => h('slider', p) },
  'react-native-safe-area-context': {
    __esModule: true,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  },
  // node has no window, so the real breakpoint width would be 0 and the bar would not render
  '@/services': { __esModule: true, useBreakpoint: () => 800 },
  'styled-components/native': {
    __esModule: true,
    useTheme: () => ({
      colors: { surface: '#fff', secondary: '#00f', placeholder: '#ccc', shadow: '#000', onSurface: '#000' },
      layouts: { small: 8, medium: 16, large: 24, defaultRadius: 12 },
      fontSizes: { h3: 20 },
    }),
  },
  '@/utils': { __esModule: true, msToDuration: () => '0:00' },
  '@/components': {
    __esModule: true,
    BaseButton: (p: any) => h(RN.Pressable, p),
    Expanded: Box,
    H4: (p: any) => h(RN.Text, null, p.children),
    IconButton: (p: any) => h(RN.Pressable, { ...p, accessibilityRole: 'button' }),
    Row: Box,
    SizedBox,
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
// eslint-disable-next-line import/first
import { FormProvider, useForm } from 'react-hook-form';

const VideoControl = require('../components/VideoControl').default;
const { Platform } = RN;

const Wrapper = (props: any) => {
  const methods = useForm<any>({
    defaultValues: { stat: { positionMillis: 0, durationMillis: 20000, volume: 1, isPlaying: false } },
  });
  return h(FormProvider as any, methods as any, h(VideoControl, props));
};
const render = (os: string, props: Record<string, unknown>): ReactTestRenderer => {
  Platform.OS = os;
  let r!: ReactTestRenderer;
  act(() => { r = TestRenderer.create(h(Wrapper, props)); });
  return r;
};
const labels = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll(n => n.props?.accessibilityRole === 'button' && typeof n.props?.accessibilityLabel === 'string')
    .map(n => n.props.accessibilityLabel);

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
const fsProps = { onFullScreenPress: () => undefined };

for (const os of ['android', 'web'] as const) {
  check(`${os}: the full-screen button is in the overlay bar, Close too`, () => {
    const l = labels(render(os, fsProps));
    assert.ok(l.includes('Full screen'), l.join('|'));
    assert.ok(l.includes('Close'), l.join('|'));
  });
  check(`${os}: the full-screen button is in the inline (portrait) bar`, () => {
    assert.ok(labels(render(os, { ...fsProps, placement: 'inline' })).includes('Full screen'));
  });
}

check('ios keeps the native controls: no full-screen button, only Close', () => {
  const l = labels(render('ios', fsProps));
  assert.ok(!l.includes('Full screen'), l.join('|'));
  assert.ok(l.includes('Close'));
});

check('full screen open: Exit full screen is there and Close (X) is not', () => {
  for (const os of ['android', 'web']) {
    const l = labels(render(os, { ...fsProps, placement: 'fullscreen', isFullScreen: true }));
    assert.ok(l.includes('Exit full screen'), `${os}: ${l.join('|')}`);
    assert.ok(!l.includes('Close'), `${os}: ${l.join('|')}`);
  }
});

console.log(`${passed} checks passed`);
