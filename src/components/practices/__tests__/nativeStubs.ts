/**
 * Test-only module redirects so React Native components render under plain
 * node with react-test-renderer (no Metro, no jest). Import this FIRST.
 *
 *  - react-native        -> react-native-web (real Pressable/Text/View)
 *  - react-native-svg    -> inert host elements
 *  - expo-image          -> a host <img> that carries its props, so a test can
 *                           read `source` and call `onError`
 *  - styled-components/native -> a theme (the real corporate tokens) plus a
 *                           minimal `styled.Pressable.attrs` that keeps the
 *                           props the wrapper receives (CSS is not evaluated)
 *  - @/services          -> useResource / useBreakpoint / useFont stand-ins
 */
import Module from 'node:module';
import React from 'react';
import corporateTokens from '../../../themes/tokens/corporate';

const THEME = {
  ...corporateTokens,
  layouts: { small: 8, medium: 16, large: 24, divider: 1, defaultRadius: 12 },
};

// The app compiles JSX with Babel's automatic runtime; tsx here uses the
// classic one, which needs React in scope.
(globalThis as any).React = React;

const h = React.createElement;

const stubs: Record<string, unknown> = {
  'react-native-svg': {
    __esModule: true,
    default: (p: any) => h('svg', p),
    Circle: (p: any) => h('circle', p),
    Path: (p: any) => h('path', p),
    Rect: (p: any) => h('rect', p),
  },
  'expo-image': {
    __esModule: true,
    Image: (p: any) => h('img', p),
  },
  'styled-components/native': {
    __esModule: true,
    useTheme: () => THEME,
    default: {
      Pressable: {
        attrs: (fn: (p: any) => any) => () => {
          const { Pressable } = require('react-native-web');
          return (p: any) => h(Pressable, { ...p, ...fn(p) });
        },
      },
    },
  },
  '@/services': {
    __esModule: true,
    useFont: () => 'NotoSansKhmer',
    // Mirrors the real hook's contract: '' when there is no file name.
    useResource: ({ name }: { name: string }) =>
      name ? `https://media.test/${name}` : '',
    useBreakpoint: (o: { mobile: number }) => o.mobile,
  },
};

const anyModule = Module as any;
const original = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request === 'react-native') return original.call(this, 'react-native-web', ...rest);
  if (request in stubs) return stubs[request];
  return original.call(this, request, ...rest);
};
