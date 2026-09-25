/**
 * Offline pending-results queue rules — coalescing of video (learning)
 * progress, and the flush's retry/poison/owner decisions.
 *
 * Plain script run by `tsx` (package.json `test:queue`) — NOT jest, same
 * style as src/themes/__tests__/themeParity.ts. It imports only the pure
 * rules module plus the redux slice (redux toolkit, no react-native), so it
 * runs in plain node. Exits non-zero on the first failed check.
 */
import assert from 'node:assert/strict';
import type { VideoProgressPayload } from '@/models';
import {
  buildLearningProgressItem,
  classifyFlushError,
  coalesceLearningProgress,
  enqueuePendingItem,
  isFlushableBy,
  MIN_POISON_AGE_MS,
  shouldDropPoison,
  type PendingResultItem,
} from '../pendingResultsQueue';
import {
  pendingResultSlice,
  PendingResultActions,
} from '../../redux/slices/PendingResultSlice';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 20, 3, 0, 0);

const progress = (
  time: number,
  ended: boolean,
  date: number,
  content_length = 60000,
): VideoProgressPayload => ({ time, ended, date, content_length });

const learning = (
  id: string,
  lessonId: string,
  payload: VideoProgressPayload,
  ownerId: string | null = 'u1',
  queuedAt = payload.date,
): PendingResultItem => ({
  id,
  kind: 'learning',
  lessonId,
  payload,
  queuedAt,
  attempts: 0,
  ownerId,
});

const practice = (id: string, lessonId: string, ownerId = 'u1'): PendingResultItem => ({
  id,
  kind: 'practice',
  lessonId,
  payload: { lessonpracticeid: lessonId } as any,
  queuedAt: T0,
  attempts: 0,
  ownerId,
});

// ---- coalesceLearningProgress ------------------------------------------

check('coalesce keeps the max time and any(ended)', () => {
  const m = coalesceLearningProgress(
    progress(58000, true, T0),
    progress(12000, false, T0 + 1000),
  );
  assert.equal(m.time, 58000);
  assert.equal(m.ended, true);
  assert.equal(m.content_length, 60000);
});

check('coalesce: ended in the NEWER report still wins', () => {
  const m = coalesceLearningProgress(
    progress(30000, false, T0),
    progress(59000, true, T0 + 1000),
  );
  assert.equal(m.ended, true);
  assert.equal(m.time, 59000);
  assert.equal(m.date, T0 + 1000);
});

check('coalesce date: earliest ENDED report (when the completion was earned)', () => {
  const m = coalesceLearningProgress(
    progress(59000, true, T0),
    progress(20000, false, T0 + DAY),
  );
  assert.equal(m.date, T0, 'rewatch next day must not move the completion day');
  const both = coalesceLearningProgress(
    progress(59000, true, T0 + DAY),
    progress(59500, true, T0),
  );
  assert.equal(both.date, T0);
});

check('coalesce date: latest watch when nothing ended', () => {
  const m = coalesceLearningProgress(
    progress(10000, false, T0 + 5000),
    progress(20000, false, T0),
  );
  assert.equal(m.date, T0 + 5000);
});

check('coalesce: media-less completion (0, true, 0) with itself stays (0, true, 0)', () => {
  const m = coalesceLearningProgress(progress(0, true, T0, 0), progress(0, true, T0 + 1, 0));
  assert.deepEqual(m, { time: 0, ended: true, content_length: 0, date: T0 });
});

// ---- enqueuePendingItem ------------------------------------------------

check('two reports for the same learning+owner collapse to one, in place', () => {
  let q: PendingResultItem[] = [];
  q = enqueuePendingItem(q, learning('a', 'L1', progress(59000, true, T0), 'u1', T0));
  q = enqueuePendingItem(q, practice('p', 'P1'));
  q = enqueuePendingItem(q, learning('b', 'L1', progress(20000, false, T0 + 1000), 'u1', T0 + 1000));
  assert.equal(q.length, 2);
  assert.equal(q[0].kind, 'learning', 'merged entry keeps its queue position');
  assert.equal(q[0].id, 'b', 'merged entry takes the new id (in-flight POST cannot dequeue it)');
  assert.equal(q[0].queuedAt, T0, 'poison age counts from the first report');
  assert.deepEqual(q[0].payload, progress(59000, true, T0));
  assert.equal(q[1].id, 'p');
});

check('different owners or different learnings are NOT coalesced', () => {
  let q: PendingResultItem[] = [];
  q = enqueuePendingItem(q, learning('a', 'L1', progress(1000, false, T0), 'u1'));
  q = enqueuePendingItem(q, learning('b', 'L1', progress(2000, false, T0), 'u2'));
  q = enqueuePendingItem(q, learning('c', 'L2', progress(3000, false, T0), 'u1'));
  assert.equal(q.length, 3);
});

check('practice/quiz results always append (each attempt is its own result)', () => {
  let q: PendingResultItem[] = [];
  q = enqueuePendingItem(q, practice('p1', 'P1'));
  q = enqueuePendingItem(q, practice('p2', 'P1'));
  assert.equal(q.length, 2);
});

// ---- the redux slice (what actually persists) --------------------------

check('slice: a rehydrated pre-learning queue keeps working and coalesces learnings', () => {
  const reducer = pendingResultSlice.reducer;
  // Shape persisted by builds before kind 'learning' existed.
  let state = { items: [practice('old-1', 'P1'), { ...practice('old-2', 'Q1'), kind: 'quiz' as const }] };
  state = reducer(state, PendingResultActions.enqueueResult(learning('a', 'L1', progress(59000, true, T0))));
  state = reducer(state, PendingResultActions.enqueueResult(learning('b', 'L1', progress(5000, false, T0 + 1))));
  assert.deepEqual(state.items.map(i => i.id), ['old-1', 'old-2', 'b']);
  assert.equal((state.items[2].payload as VideoProgressPayload).ended, true);
  state = reducer(state, PendingResultActions.dequeueResult('a'));
  assert.equal(state.items.length, 3, 'dequeue by the pre-merge id is a no-op');
  state = reducer(state, PendingResultActions.dequeueResult('b'));
  assert.deepEqual(state.items.map(i => i.id), ['old-1', 'old-2']);
});

// ---- flush decisions ---------------------------------------------------

check('offline / timeout / 5xx / 401 / 408 / 429 stop the flush and keep the item', () => {
  const offline = Object.assign(new Error('Cannot reach API'), {
    status: null,
    problem: 'NETWORK_ERROR',
  });
  assert.equal(classifyFlushError(offline), 'stop');
  assert.equal(classifyFlushError({ status: undefined, problem: 'TIMEOUT_ERROR' }), 'stop');
  for (const status of [500, 502, 401, 408, 429]) {
    assert.equal(classifyFlushError({ status }), 'stop', `status ${status}`);
  }
});

check('other 4xx (e.g. deleted learning) are poison: skipped, not blocking', () => {
  for (const status of [400, 403, 404, 422]) {
    assert.equal(classifyFlushError({ status }), 'poison', `status ${status}`);
  }
});

check('learning 400: transient (unknown / DB) message stops, keeps the item', () => {
  // updatelearningprogress wraps any in-transaction error as a 400.
  for (const serverMessage of [
    'Lock wait timeout exceeded; try restarting transaction',
    'Validation error', // sequelize unique-key race on first create
    'Learning Lesson Not Found ', // near-miss: exact match only
    '',
  ]) {
    assert.equal(
      classifyFlushError({ status: 400, serverMessage }, 'learning'),
      'stop',
      serverMessage,
    );
  }
  // No server message at all (e.g. a body that isn't the API's shape).
  assert.equal(classifyFlushError({ status: 400 }, 'learning'), 'stop');
});

check('learning 400: known permanent server messages are poison', () => {
  for (const serverMessage of [
    'Learning Lesson Not Found',
    'Student Not Found',
    'Content Lenght can not equal 0',
    '"time" must be greater than or equal to 0',
    '"ended" is required',
    '"Invalid Date" must be a valid date',
    '"content_length" must be a number, "time" is required',
  ]) {
    assert.equal(
      classifyFlushError({ status: 400, serverMessage }, 'learning'),
      'poison',
      serverMessage,
    );
  }
});

check('the learning-400 stopgap leaves practice/quiz and other learning 4xx alone', () => {
  const transient = { status: 400, serverMessage: 'Lock wait timeout exceeded' };
  assert.equal(classifyFlushError(transient, 'practice'), 'poison');
  assert.equal(classifyFlushError(transient, 'quiz'), 'poison');
  assert.equal(classifyFlushError(transient), 'poison');
  for (const status of [403, 404, 422]) {
    assert.equal(classifyFlushError({ status }, 'learning'), 'poison', `status ${status}`);
  }
  for (const status of [500, 401, 429]) {
    assert.equal(classifyFlushError({ status }, 'learning'), 'stop', `status ${status}`);
  }
});

check('no owner, no queue item: learning progress is never queued ownerless', () => {
  const base = {
    id: 'x',
    lessonLearningId: 'L1',
    payload: progress(5000, false, T0),
    now: T0 + 1,
  };
  assert.equal(buildLearningProgressItem({ ...base, ownerId: null }), null);
  assert.equal(buildLearningProgressItem({ ...base, ownerId: undefined }), null);
  assert.equal(buildLearningProgressItem({ ...base, ownerId: '' }), null);
  assert.deepEqual(buildLearningProgressItem({ ...base, ownerId: 'u1' }), {
    id: 'x',
    kind: 'learning',
    lessonId: 'L1',
    payload: base.payload,
    queuedAt: T0 + 1,
    attempts: 0,
    ownerId: 'u1',
  });
});

check('poison is dropped only after 10 attempts AND 24 h', () => {
  const now = T0 + MIN_POISON_AGE_MS + 1;
  assert.equal(shouldDropPoison(10, T0, now), true);
  assert.equal(shouldDropPoison(9, T0, now), false);
  assert.equal(shouldDropPoison(50, T0, T0 + MIN_POISON_AGE_MS - 1), false);
});

check('flush sends own and legacy (null-owner) items only', () => {
  assert.equal(isFlushableBy(learning('a', 'L1', progress(1, false, T0), 'u1'), 'u1'), true);
  assert.equal(isFlushableBy(learning('a', 'L1', progress(1, false, T0), null), 'u1'), true);
  assert.equal(isFlushableBy(learning('a', 'L1', progress(1, false, T0), 'u2'), 'u1'), false);
});

console.log(`pendingResultsQueue: ${passed} checks passed`);
