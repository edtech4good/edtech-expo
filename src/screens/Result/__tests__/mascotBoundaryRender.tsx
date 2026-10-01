/**
 * MascotBoundary behaviour, rendered (react-test-renderer over react-native-web,
 * see src/components/practices/__tests__/nativeStubs.ts). mascot.ts only
 * checks the source text; this proves the contract: a mascot that throws (sync,
 * a rejected lazy chunk, or a player that throws inside the real renderers)
 * renders nothing and never takes the sibling "Finish" button down with it.
 *
 * Plain script run by `tsx` (package.json `test:result`). Exits non-zero on
 * the first failed check.
 */
import '../../../components/practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React, { lazy, Suspense } from 'react';

const h = React.createElement;
const ThrowingPlayer = () => {
  throw new Error('player blew up');
};
const extra: Record<string, unknown> = {
  '@expo/metro-runtime/async-require': {},
  './mascotSources': {
    __esModule: true,
    loadMascot: async () => ({ v: '5.0.0' }),
    mascotPlayable: () => true,
  },
  './MascotPlayer': { __esModule: true, default: ThrowingPlayer },
  'lottie-react-native': { __esModule: true, default: ThrowingPlayer },
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request in extra) return extra[request];
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';

// React logs caught render errors; they are expected here.
const realError = console.error;
const realWarn = console.warn;
const warnings: unknown[][] = [];
console.error = () => {};
console.warn = (...a: unknown[]) => {
  warnings.push(a);
};
process.on('uncaughtException', e => {
  console.error = realError;
  console.error('uncaught exception escaped the boundary', e);
  process.exit(1);
});

const finish = () => h('Text', { testID: 'finish' }, 'Finish');
const hasFinish = (r: ReactTestRenderer) => r.root.findAll(n => n.props?.testID === 'finish').length > 0;
const settle = () => act(async () => { await new Promise(res => setTimeout(res, 20)); });

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error = realError;
    console.error(`FAIL ${name}`);
    throw e;
  }
}

async function main() {
  const MascotBoundary = require('../MascotBoundary').default;
  const Thrower = () => {
    throw new Error('sync');
  };

  await check('a child that throws renders nothing and the sibling survives', async () => {
    const before = warnings.length;
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        h(React.Fragment, null, h(MascotBoundary, null, h(Thrower)), finish()),
      );
    });
    assert.ok(hasFinish(r), 'Finish sibling must still render');
    assert.equal(r.root.findAllByType(Thrower).length, 0, 'the failed child must not render');
    assert.equal(warnings.length - before, 1, 'one warning for the contained failure');
    // A healthy child still shows.
    let ok!: ReactTestRenderer;
    act(() => {
      ok = TestRenderer.create(h(MascotBoundary, null, h('Text', { testID: 'kid' }, 'x')));
    });
    assert.equal(ok.root.findAll(n => n.props?.testID === 'kid').length, 1, 'healthy child renders');
  });

  await check('a lazy chunk that rejects is contained', async () => {
    const Lazy = lazy(() => Promise.reject(new Error('chunk')));
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        h(
          React.Fragment,
          null,
          h(MascotBoundary, null, h(Suspense, { fallback: null }, h(Lazy))),
          finish(),
        ),
      );
    });
    await settle();
    assert.ok(hasFinish(r), 'Finish sibling must survive the rejected chunk');
    assert.equal(r.root.findAllByType(MascotBoundary).length, 1);
  });

  for (const file of ['../ResultIllustration.web', '../ResultIllustration']) {
    await check(`${file.slice(3)} default export contains a throwing player`, async () => {
      const Illustration = require(file).default;
      let r!: ReactTestRenderer;
      act(() => {
        r = TestRenderer.create(
          h(
            React.Fragment,
            null,
            h(Illustration, { band: 'pass', character: 'bear', reducedMotion: true }),
            finish(),
          ),
        );
      });
      await settle();
      assert.ok(hasFinish(r), 'Finish sibling must survive a throwing player');
      assert.equal(r.root.findAllByType(MascotBoundary).length, 1, 'default export is wrapped in MascotBoundary');
      assert.equal(r.root.findAllByType(ThrowingPlayer).length, 0, 'the failed player must not render');
    });
  }
  console.log(`${passed} checks passed`);
}

main().then(
  () => {
    console.error = realError;
    console.warn = realWarn;
  },
  e => {
    console.error = realError;
    console.error(e);
    process.exit(1);
  },
);
