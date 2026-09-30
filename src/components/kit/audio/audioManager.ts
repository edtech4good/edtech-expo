// One audio player for the whole app: at most one clip plays at a time.
// Starting a clip stops and unloads the one before it. Built on expo-av,
// loaded lazily so the rules can be tested in plain node with a fake sound.
//
// A clip is identified by an id the caller picks (a question or option id).
// Anything that shows a clip's state subscribes to that id.

export type ClipStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface ClipState {
  status: ClipStatus;
  positionMs: number;
  durationMs: number;
}

export const IDLE_CLIP: ClipState = { status: 'idle', positionMs: 0, durationMs: 0 };

/** The slice of expo-av's PlaybackStatus the manager reads. */
export interface PlaybackStatusLike {
  isLoaded: boolean;
  isPlaying?: boolean;
  didJustFinish?: boolean;
  positionMillis?: number;
  durationMillis?: number;
  error?: string;
}

/** The slice of expo-av's Audio.Sound the manager uses. */
export interface SoundLike {
  loadAsync(
    source: { uri: string } | number,
    initialStatus?: { shouldPlay?: boolean; progressUpdateIntervalMillis?: number },
  ): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
  setOnPlaybackStatusUpdate(cb: ((s: PlaybackStatusLike) => void) | null): void;
}

export type SoundFactory = () => SoundLike;

/** A file URI (from useResource) or a bundled asset (a `require()` number). */
export type ClipSource = string | number;

const defaultFactory: SoundFactory = () => {
  // Lazy: importing expo-av at module load would break plain-node tests.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Audio } = require('expo-av');
  return new Audio.Sound() as SoundLike;
};

type Listener = (state: ClipState) => void;

export class AudioManager {
  private readonly factory: SoundFactory;
  private states = new Map<string, ClipState>();
  private listeners = new Map<string, Set<Listener>>();
  private currentId: string | null = null;
  private sound: SoundLike | null = null;
  /** Bumped on every play/stop, so a load that finishes late can tell it lost. */
  private generation = 0;

  constructor(factory: SoundFactory = defaultFactory) {
    this.factory = factory;
  }

  getState(id: string): ClipState {
    return this.states.get(id) ?? IDLE_CLIP;
  }

  /** The id of the clip that is loading or playing, or null. */
  get activeId(): string | null {
    return this.currentId;
  }

  subscribe(id: string, cb: Listener): () => void {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(cb);
    return () => {
      set?.delete(cb);
      if (set && set.size === 0) this.listeners.delete(id);
    };
  }

  private setState(id: string, state: ClipState) {
    if (state.status === 'idle') this.states.delete(id);
    else this.states.set(id, state);
    this.listeners.get(id)?.forEach(cb => cb(state));
  }

  /**
   * Takes the current clip out of play, synchronously: bumps the generation
   * (so its late callbacks and late load are ignored), clears the current id
   * and its state, and hands back the sound to unload. Doing this without an
   * await is what keeps two quick plays from both winning.
   */
  private detach(): SoundLike | null {
    const id = this.currentId;
    const sound = this.sound;
    this.generation++;
    this.currentId = null;
    this.sound = null;
    if (id) this.setState(id, IDLE_CLIP);
    sound?.setOnPlaybackStatusUpdate(null);
    return sound;
  }

  /** Plays `id` from the start, stopping whatever else is playing. */
  async play(id: string, source: ClipSource): Promise<void> {
    // One player: whatever is loading or playing (even this same clip) goes
    // first. The takeover below is synchronous, so of several quick plays the
    // last one wins and the others are unloaded, never left playing.
    const previous = this.detach();
    const generation = ++this.generation;
    const sound = this.factory();
    this.sound = sound;
    this.currentId = id;
    this.setState(id, { status: 'loading', positionMs: 0, durationMs: 0 });

    sound.setOnPlaybackStatusUpdate(status => {
      if (generation !== this.generation) return;
      if (!status.isLoaded) {
        if (status.error) void this.fail(id, generation);
        return;
      }
      if (status.didJustFinish) {
        void this.finish(id, generation);
        return;
      }
      this.setState(id, {
        status: status.isPlaying ? 'playing' : 'loading',
        positionMs: status.positionMillis ?? 0,
        durationMs: status.durationMillis ?? 0,
      });
    });

    try {
      if (previous) await previous.unloadAsync().catch(() => undefined);
      if (generation !== this.generation) {
        await sound.unloadAsync().catch(() => undefined);
        return;
      }
      await sound.loadAsync(
        typeof source === 'number' ? source : { uri: source },
        { shouldPlay: true, progressUpdateIntervalMillis: 200 },
      );
      if (generation !== this.generation) {
        // Something else started (or stop() ran) while this clip loaded.
        await sound.unloadAsync().catch(() => undefined);
      }
    } catch {
      if (generation !== this.generation) {
        await sound.unloadAsync().catch(() => undefined);
        return;
      }
      await this.fail(id, generation);
    }
  }

  /** Stops and unloads the current clip, if any. Safe to call any time. */
  async stop(): Promise<void> {
    const sound = this.detach();
    if (sound) await sound.unloadAsync().catch(() => undefined);
  }

  /** Stops `id` only if it is the current clip (use when its screen goes away). */
  async release(id: string): Promise<void> {
    if (this.currentId === id) await this.stop();
    else this.setState(id, IDLE_CLIP);
  }

  /** Clears an error state back to idle. */
  clearError(id: string) {
    if (this.getState(id).status === 'error') this.setState(id, IDLE_CLIP);
  }

  private async finish(id: string, generation: number) {
    if (generation !== this.generation) return;
    await this.stop();
    this.setState(id, IDLE_CLIP);
  }

  /** A missing or undecodable file: a non-blocking error state, never a throw. */
  private async fail(id: string, generation: number) {
    if (generation !== this.generation) return;
    const sound = this.detach();
    if (sound) await sound.unloadAsync().catch(() => undefined);
    this.setState(id, { status: 'error', positionMs: 0, durationMs: 0 });
  }
}

/** The app-wide player. */
export const audioManager = new AudioManager();

/** m:ss, for the elapsed time in the Listen pill. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** 0..1 for the option circle's progress ring; 0 until the length is known. */
export function progressFraction(state: ClipState): number {
  if (state.durationMs <= 0) return 0;
  return Math.max(0, Math.min(1, state.positionMs / state.durationMs));
}
