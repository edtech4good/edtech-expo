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
import '../../practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React, { lazy, Suspense } from 'react';

const h = React.createElement;
const ThrowingPlayer = () => {
  throw new Error('player blew up');
};
// Switchable doubles: the contained-failure checks use the throwing player;
// the behaviour checks swap in one that records the props it was given.
const mock: {
  player: (p: any) => any;
  load: (character: string, clip: string) => Promise<object>;
  loads: string[];
} = { player: ThrowingPlayer, load: async () => ({ v: '5.0.0' }), loads: [] };
const SwitchPlayer = (p: any) => mock.player(p);
const extra: Record<string, unknown> = {
  '@expo/metro-runtime/async-require': {},
  './mascotSources': {
    __esModule: true,
    loadMascot: (c: string, clip: string) => {
      mock.loads.push(`${c}-${clip}`);
      return mock.load(c, clip);
    },
    mascotPlayable: () => true,
  },
  './MascotPlayer': { __esModule: true, default: SwitchPlayer },
  'lottie-react-native': { __esModule: true, default: SwitchPlayer },
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

  for (const file of ['../Mascot.web', '../Mascot']) {
    await check(`${file.slice(3)} default export contains a throwing player`, async () => {
      const Illustration = require(file).default;
      let r!: ReactTestRenderer;
      act(() => {
        r = TestRenderer.create(
          h(
            React.Fragment,
            null,
            h(Illustration, { clip: 'idle', character: 'bear', reducedMotion: true }),
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

  // ---- behaviour of the shared component (a recording player) ----------
  const seen: any[] = [];
  const recorder = (p: any) => {
    seen.push(p);
    return h('Text', { testID: 'player' }, 'player');
  };
  const players = (r: ReactTestRenderer) => r.root.findAll(n => n.props?.testID === 'player' && typeof n.type === 'string');
  const mount = async (el: React.ReactElement) => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(el);
    });
    await settle();
    return r;
  };

  for (const file of ['../Mascot.web', '../Mascot']) {
    const name = file.slice(3);
    const Mascot = require(file).default;
    const web = file.endsWith('.web');
    // native passes {autoPlay, loop, progress}; web passes {autoPlay, loop, staticProgress}
    const cfg = (p: any) => ({ autoPlay: p.autoPlay, loop: p.loop, still: web ? p.staticProgress : p.progress });

    await check(`${name}: idle loops and plays`, async () => {
      mock.player = recorder;
      seen.length = 0;
      await mount(h(Mascot, { clip: 'idle', character: 'rabbit', reducedMotion: false }));
      assert.deepEqual(cfg(seen[seen.length - 1]), { autoPlay: true, loop: true, still: undefined });
    });

    await check(`${name}: pass plays once, no loop`, async () => {
      seen.length = 0;
      await mount(h(Mascot, { clip: 'pass', character: 'bear', reducedMotion: false }));
      assert.deepEqual(cfg(seen[seen.length - 1]), { autoPlay: true, loop: false, still: undefined });
    });

    await check(`${name}: reduced motion shows one still frame, no playback`, async () => {
      seen.length = 0;
      await mount(h(Mascot, { clip: 'idle', character: 'bear', reducedMotion: true }));
      assert.deepEqual(cfg(seen[seen.length - 1]), { autoPlay: false, loop: false, still: 0 });
      seen.length = 0;
      await mount(h(Mascot, { clip: 'try-again', character: 'bear', reducedMotion: true }));
      assert.deepEqual(cfg(seen[seen.length - 1]), { autoPlay: false, loop: false, still: 1 });
    });

    await check(`${name}: character is random per mount and stable across re-renders`, async () => {
      const realRandom = Math.random;
      try {
        mock.loads.length = 0;
        Math.random = () => 0.9; // rabbit
        const r = await mount(h(Mascot, { clip: 'idle', reducedMotion: true }));
        assert.deepEqual(mock.loads, ['rabbit-idle']);
        Math.random = () => 0.1; // would be bear if it re-rolled
        act(() => r.update(h(Mascot, { clip: 'idle', reducedMotion: true, compact: true })));
        await settle();
        assert.deepEqual(mock.loads, ['rabbit-idle'], 'a re-render must not re-roll the character');
        await mount(h(Mascot, { clip: 'idle', reducedMotion: true }));
        assert.deepEqual(mock.loads, ['rabbit-idle', 'bear-idle'], 'a new mount rolls again');
      } finally {
        Math.random = realRandom;
      }
    });

    await check(`${name}: artwork that fails to load leaves no slot and no gap`, async () => {
      mock.load = () => Promise.reject(new Error('404'));
      const r = await mount(h(React.Fragment, null, h(Mascot, { clip: 'idle', gapBelow: 16 }), finish()));
      mock.load = async () => ({ v: '5.0.0' });
      assert.ok(hasFinish(r));
      const out = JSON.stringify(r.toJSON());
      assert.ok(!/aria-hidden/.test(out), 'no reserved mascot box');
      assert.ok(!/margin-bottom|marginBottom/.test(out), 'no leftover gap');
    });

    await check(`${name}: decorative, hidden from assistive tech`, async () => {
      seen.length = 0;
      const r = await mount(h(Mascot, { clip: 'idle', character: 'bear', reducedMotion: true }));
      assert.match(JSON.stringify(r.toJSON()), /aria-hidden/);
    });
  }
  mock.player = ThrowingPlayer;
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
