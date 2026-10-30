/**
 * The lesson video's full-screen button (edtech-expo#143): it must be a
 * button TalkBack can find, large enough to hit, labelled in English from the
 * `player` locale keys, and its label must follow the state (open / close).
 * react-test-renderer over react-native-web (see
 * src/components/practices/__tests__/nativeStubs.ts); the interface language
 * is the real src/locales/en.json, so a key missing from it fails here too.
 *
 * Plain script run by `tsx` (package.json `test:fullscreenbutton`). Exits
 * non-zero on the first failure.
 */
import '../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../locales/en.json'), 'utf8'),
);
const translate = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), en) ?? key;

const h = React.createElement;
const extra: Record<string, unknown> = {
  'react-i18next': { __esModule: true, useTranslation: () => ({ t: translate }) },
  '@expo/vector-icons': {
    __esModule: true,
    MaterialCommunityIcons: (p: any) => h('icon', p),
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

const FullScreenButton = require('../components/FullScreenButton').default;
const SIZE = require('../components/FullScreenButton').FULL_SCREEN_BUTTON_SIZE;

const render = (isFullScreen: boolean, onPress = () => undefined): ReactTestRenderer => {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(h(FullScreenButton, { isFullScreen, onPress }));
  });
  return r;
};
const button = (r: ReactTestRenderer) => {
  const b = r.root.findAll(n => n.props?.accessibilityRole === 'button' && n.props?.accessibilityLabel)[0];
  assert.ok(b, 'a button with an accessibility label');
  return b!;
};
const styleOf = (n: any) =>
  Array.isArray(n.props.style) ? Object.assign({}, ...n.props.style.flat(9)) : n.props.style;

check('closed: the label says it opens full screen (English, from en.json)', () => {
  assert.equal(button(render(false)).props.accessibilityLabel, 'Full screen');
});

check('open: the label says it leaves full screen', () => {
  assert.equal(button(render(true)).props.accessibilityLabel, 'Exit full screen');
});

check('the label follows the state on re-render', () => {
  const r = render(false);
  act(() => {
    r.update(h(FullScreenButton, { isFullScreen: true, onPress: () => undefined }));
  });
  assert.equal(button(r).props.accessibilityLabel, 'Exit full screen');
});

check('the icon follows the state', () => {
  assert.equal(render(false).root.findByType('icon' as any).props.name, 'fullscreen');
  assert.equal(render(true).root.findByType('icon' as any).props.name, 'fullscreen-exit');
});

check('the touch target is at least 44 pt each way', () => {
  const s = styleOf(button(render(false)));
  assert.ok(SIZE >= 44);
  assert.ok(s.width >= 44 && s.height >= 44, `got ${s.width}x${s.height}`);
});

check('a press calls onPress', () => {
  let n = 0;
  const b = button(render(false, () => { n += 1; }));
  act(() => { b.props.onPress(); });
  assert.equal(n, 1);
});

console.log(`${passed} checks passed`);
