/**
 * The audio manager's rules (src/components/kit/audio/audioManager.ts): one
 * clip at a time, the previous one unloaded when another starts, a stop or a
 * finish unloads, a late load loses to a newer play, and a failing load is an
 * error state and never a throw. Runs against a fake `expo-av` Sound that
 * records every call.
 *
 * Plain script run by `tsx` (package.json `test:kit`). Exits non-zero on the
 * first failed check.
 */
import assert from 'node:assert/strict';
import {
  AudioManager,
  ClipState,
  formatClock,
  PlaybackStatusLike,
  progressFraction,
  SoundLike,
} from '../audio/audioManager';

class FakeSound implements SoundLike {
  static all: FakeSound[] = [];
  loaded = false;
  unloads = 0;
  pauses = 0;
  plays = 0;
  failPause = false;
  source: unknown = null;
  cb: ((s: PlaybackStatusLike) => void) | null = null;
  failLoad = false;
  gate: Promise<void> | null = null;
  constructor() {
    FakeSound.all.push(this);
  }
  async loadAsync(source: { uri: string } | number) {
    if (this.gate) await this.gate;
    if (this.failLoad) throw new Error('boom');
    this.loaded = true;
    this.source = source;
    return {};
  }
  async unloadAsync() {
    this.loaded = false;
    this.unloads++;
    return {};
  }
  async pauseAsync() {
    this.pauses++;
    if (this.failPause) throw new Error('pause failed');
    return {};
  }
  async playAsync() {
    this.plays++;
    return {};
  }
  setOnPlaybackStatusUpdate(cb: ((s: PlaybackStatusLike) => void) | null) {
    this.cb = cb;
  }
  emit(s: PlaybackStatusLike) {
    this.cb?.(s);
  }
}

function fresh() {
  FakeSound.all = [];
  return new AudioManager(() => new FakeSound());
}
const loadedCount = () => FakeSound.all.filter(s => s.loaded).length;

async function main() {
  // 1. Play loads one sound and reports playing.
  {
    const m = fresh();
    await m.play('a', 'file:///a.mp3');
    assert.equal(loadedCount(), 1);
    assert.equal(m.activeId, 'a');
    assert.equal(m.getState('a').status, 'loading');
    FakeSound.all[0].emit({ isLoaded: true, isPlaying: true, positionMillis: 500, durationMillis: 2000 });
    assert.deepEqual(m.getState('a'), { status: 'playing', positionMs: 500, durationMs: 2000 });
    console.log('ok  play loads one sound and reports progress');
  }

  // 2. Single-player rule: starting b stops and unloads a.
  {
    const m = fresh();
    await m.play('a', 'file:///a.mp3');
    await m.play('b', 'file:///b.mp3');
    assert.equal(FakeSound.all.length, 2);
    assert.equal(FakeSound.all[0].unloads, 1, 'a unloaded');
    assert.equal(FakeSound.all[0].loaded, false);
    assert.equal(FakeSound.all[1].loaded, true);
    assert.equal(loadedCount(), 1, 'never two loaded at once');
    assert.equal(m.activeId, 'b');
    assert.equal(m.getState('a').status, 'idle');
    // A stale update from the old sound is ignored.
    FakeSound.all[0].emit({ isLoaded: true, isPlaying: true, positionMillis: 900 });
    assert.equal(m.getState('a').status, 'idle');
    console.log('ok  starting a second clip stops and unloads the first');
  }

  // 3. Stop unloads and clears state; stop with nothing playing is safe.
  {
    const m = fresh();
    await m.stop();
    await m.play('a', 'x');
    await m.stop();
    assert.equal(FakeSound.all[0].unloads, 1);
    assert.equal(m.activeId, null);
    assert.equal(m.getState('a').status, 'idle');
    await m.stop();
    assert.equal(FakeSound.all[0].unloads, 1, 'second stop is a no-op');
    console.log('ok  stop unloads once and is safe to repeat');
  }

  // 4. Finish unloads and returns to idle.
  {
    const m = fresh();
    await m.play('a', 'x');
    FakeSound.all[0].emit({ isLoaded: true, isPlaying: false, didJustFinish: true });
    await new Promise(r => setImmediate(r));
    assert.equal(FakeSound.all[0].unloads, 1);
    assert.equal(m.getState('a').status, 'idle');
    assert.equal(m.activeId, null);
    console.log('ok  a clip that finishes is unloaded');
  }

  // 5. release(id) stops only the current clip (unmount of another is harmless).
  {
    const m = fresh();
    await m.play('a', 'x');
    await m.release('b');
    assert.equal(m.activeId, 'a');
    assert.equal(FakeSound.all[0].unloads, 0);
    await m.release('a');
    assert.equal(m.activeId, null);
    assert.equal(FakeSound.all[0].unloads, 1);
    console.log('ok  release stops only the clip it names');
  }

  // 6. A failing load is an error state, unloads, and does not throw.
  {
    const m2 = new AudioManager(() => {
      const s = new FakeSound();
      s.failLoad = true;
      return s;
    });
    FakeSound.all = [];
    await m2.play('bad', 'file:///missing.mp3');
    assert.equal(m2.getState('bad').status, 'error');
    assert.equal(m2.activeId, null);
    assert.equal(FakeSound.all[0].unloads, 1);
    // Retry after clearError works and plays.
    m2.clearError('bad');
    assert.equal(m2.getState('bad').status, 'idle');
    console.log('ok  a load failure is an error state, not a throw');
  }

  // 7. A late load loses to a newer play.
  {
    FakeSound.all = [];
    let release!: () => void;
    let n = 0;
    const m = new AudioManager(() => {
      const s = new FakeSound();
      if (n++ === 0) s.gate = new Promise<void>(r => (release = r));
      return s;
    });
    const first = m.play('slow', 'x');
    await new Promise(r => setImmediate(r));
    await m.play('fast', 'y');
    release();
    await first;
    assert.equal(m.activeId, 'fast');
    assert.equal(loadedCount(), 1, 'the slow clip was unloaded when it finished loading');
    assert.equal(FakeSound.all[0].loaded, false);
    console.log('ok  a slow load that loses the race is unloaded');
  }

  // 7b. Quick taps: three plays started without waiting. The last one wins,
  // and no earlier one is left loaded (this once left two clips playing).
  {
    const m = fresh();
    await m.play('q', 'x');
    const p1 = m.play('a', 'x');
    const p2 = m.play('b', 'x');
    const p3 = m.play('c', 'x');
    await Promise.all([p1, p2, p3]);
    assert.equal(m.activeId, 'c');
    assert.equal(loadedCount(), 1, 'exactly one sound loaded');
    assert.equal(m.getState('a').status, 'idle');
    assert.equal(m.getState('b').status, 'idle');
    assert.equal(m.getState('c').status, 'loading');
    console.log('ok  overlapping plays: last wins, none left playing');
  }

  // 8. Subscribers hear their own clip only, and can unsubscribe.
  {
    const m = fresh();
    const seen: ClipState[] = [];
    const off = m.subscribe('a', s => seen.push(s));
    await m.play('b', 'x');
    assert.equal(seen.length, 0);
    await m.play('a', 'x');
    assert.equal(seen[0].status, 'loading');
    off();
    await m.stop();
    assert.equal(seen.length, 1);
    console.log('ok  subscriptions are per clip');
  }

  // 9. Bundled asset (number) sources are passed through as-is.
  {
    const m = fresh();
    await m.play('a', 42);
    assert.equal(FakeSound.all[0].source, 42);
    await m.play('b', 'file:///b.mp3');
    assert.deepEqual(FakeSound.all[1].source, { uri: 'file:///b.mp3' });
    console.log('ok  number and uri sources');
  }

  // 11. Finish then replay while the unload is still pending: the replay must
  // not be overwritten by a late "idle" (this left activeId 'q' with status idle).
  {
    const m = fresh();
    await m.play('q', 'x');
    FakeSound.all[0].emit({ isLoaded: true, isPlaying: false, didJustFinish: true });
    const replay = m.play('q', 'x'); // before finish()'s unload has settled
    await replay;
    await new Promise(r => setImmediate(r));
    assert.equal(m.activeId, 'q');
    assert.equal(m.getState('q').status, 'loading', 'replay is not overwritten by idle');
    console.log('ok  replay right after a finish keeps its state');
  }

  // 11b. Same for a failure: an error must not land on top of a replay.
  {
    const m = fresh();
    await m.play('q', 'x');
    FakeSound.all[0].emit({ isLoaded: false, error: 'decode' });
    const replay = m.play('q', 'x');
    await replay;
    await new Promise(r => setImmediate(r));
    assert.equal(m.activeId, 'q');
    assert.equal(m.getState('q').status, 'loading', 'replay is not overwritten by error');
    console.log('ok  replay right after a failure keeps its state');
  }

  // 12. Real pause: keeps the clip loaded and its position; resume continues.
  {
    const m = fresh();
    await m.play('a', 'x');
    const snd = FakeSound.all[0];
    snd.emit({ isLoaded: true, isPlaying: true, positionMillis: 1500, durationMillis: 3000 });
    await m.toggle('a', 'x'); // playing -> pause
    assert.equal(snd.pauses, 1);
    assert.equal(snd.unloads, 0, 'a paused clip stays loaded');
    assert.equal(snd.loaded, true);
    assert.equal(m.activeId, 'a');
    assert.deepEqual(m.getState('a'), { status: 'paused', positionMs: 1500, durationMs: 3000 });
    await m.toggle('a', 'x'); // paused -> resume, same sound, same position
    assert.equal(snd.plays, 1);
    assert.equal(FakeSound.all.length, 1, 'resume does not load a new sound');
    assert.deepEqual(m.getState('a'), { status: 'playing', positionMs: 1500, durationMs: 3000 });
    console.log('ok  pause keeps the clip loaded and resume continues from the same position');
  }

  // 13. A paused clip that another clip takes over is unloaded; blur/unmount release it.
  {
    const m = fresh();
    await m.play('a', 'x');
    FakeSound.all[0].emit({ isLoaded: true, isPlaying: true, positionMillis: 100, durationMillis: 3000 });
    await m.pause('a');
    await m.play('b', 'y');
    assert.equal(FakeSound.all[0].unloads, 1, 'paused clip unloaded on takeover');
    assert.equal(m.getState('a').status, 'idle');
    await m.pause('b'); // b is only loading: nothing to pause
    assert.equal(FakeSound.all[1].pauses, 0);
    FakeSound.all[1].emit({ isLoaded: true, isPlaying: true, positionMillis: 0, durationMillis: 3000 });
    await m.pause('b');
    await m.release('b');
    assert.equal(FakeSound.all[1].unloads, 1, 'release unloads a paused clip');
    console.log('ok  takeover and release unload a paused clip');
  }

  // 14. Loading: a tap cancels; an OS interruption maps to paused, buffering to loading.
  {
    const m = fresh();
    await m.play('a', 'x');
    assert.equal(m.getState('a').status, 'loading');
    await m.toggle('a', 'x');
    assert.equal(m.activeId, null);
    assert.equal(FakeSound.all[0].unloads, 1);
    assert.equal(m.getState('a').status, 'idle');

    await m.play('b', 'x');
    const s2 = FakeSound.all[1];
    s2.emit({ isLoaded: true, isPlaying: true, positionMillis: 200, durationMillis: 3000 });
    assert.equal(m.getState('b').status, 'playing');
    s2.emit({ isLoaded: true, isPlaying: false, positionMillis: 250, durationMillis: 3000 }); // a call, focus lost
    assert.equal(m.getState('b').status, 'paused');
    s2.emit({ isLoaded: true, isPlaying: false, isBuffering: true, positionMillis: 250, durationMillis: 3000 });
    assert.equal(m.getState('b').status, 'loading');
    // Resuming after an OS pause works from the paused state.
    s2.emit({ isLoaded: true, isPlaying: false, positionMillis: 250, durationMillis: 3000 });
    await m.toggle('b', 'x');
    assert.equal(s2.plays, 1);
    console.log('ok  loading cancels; OS interruption is paused, buffering is loading');
  }

  // 15. release() of a non-current clip in the error state returns it to idle.
  {
    const m = new AudioManager(() => {
      const snd = new FakeSound();
      snd.failLoad = true;
      return snd;
    });
    await m.play('bad', 'x');
    assert.equal(m.getState('bad').status, 'error');
    await m.play('other', 'y'); // fails too, but 'bad' is no longer current
    assert.equal(m.activeId, null);
    await m.release('bad');
    assert.equal(m.getState('bad').status, 'idle', 'release clears an error on a non-current clip');
    // toggle on an error retries.
    const m2 = fresh();
    await m2.play('e', 'x');
    FakeSound.all[0].emit({ isLoaded: false, error: 'x' });
    await new Promise(r => setImmediate(r));
    assert.equal(m2.getState('e').status, 'error');
    await m2.toggle('e', 'x');
    assert.equal(m2.getState('e').status, 'loading');
    console.log('ok  release clears an error; toggle on an error retries');
  }

  // 16. A pause that throws is an error state, not a crash.
  {
    const m = fresh();
    await m.play('a', 'x');
    FakeSound.all[0].failPause = true;
    FakeSound.all[0].emit({ isLoaded: true, isPlaying: true, positionMillis: 0, durationMillis: 1000 });
    await m.pause('a');
    assert.equal(m.getState('a').status, 'error');
    assert.equal(m.activeId, null);
    console.log('ok  a failing pause is an error state');
  }

  // 10. Clock and ring helpers.
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(7400), '0:07');
  assert.equal(formatClock(65000), '1:05');
  assert.equal(formatClock(-5), '0:00');
  assert.equal(progressFraction({ status: 'playing', positionMs: 500, durationMs: 2000 }), 0.25);
  assert.equal(progressFraction({ status: 'loading', positionMs: 500, durationMs: 0 }), 0);
  assert.equal(progressFraction({ status: 'playing', positionMs: 5000, durationMs: 2000 }), 1);
  console.log('ok  formatClock and progressFraction');

  console.log('\nall audio manager checks passed');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
