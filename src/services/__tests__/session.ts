/**
 * Session rules: where a restored session belongs after a restart, and how a
 * session ends (sign-out and a token the server refuses).
 *
 * Plain script run by `tsx` (package.json `test:session`), not jest. It
 * imports the pure session module and the real Api class (axios's adapter is
 * swapped to answer 401s), never React or expo-router. Exits non-zero on the
 * first failed check.
 */
import assert from 'node:assert/strict';

(globalThis as any).__DEV__ = false;
process.env.EXPO_PUBLIC_BASE_URL = 'http://student.test';
process.env.EXPO_PUBLIC_SYNC_URL = 'http://central.test';

import Api from '../api/Api';
import {
  endSession,
  isEntryPath,
  LEARNER_HOME_ROUTE,
  LOGIN_ROUTE,
  needsLogin,
  profileFromToken,
  restoreProfile,
  routeForProfile,
  startRoute,
  TEACHER_HOME_ROUTE,
} from '../session';

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const learner = { schooluserrole: 4 };
const teacher = { schooluserrole: 3 };

/** Answers every request on `api` with `status`; returns what was asked. */
function answerWith(api: Api, status: number) {
  const asked: string[] = [];
  api.apiSauceInstance.axiosInstance.defaults.adapter = async config => {
    asked.push(String(config.url));
    const ok = status >= 200 && status < 300;
    const response = { data: { error: !ok }, status, statusText: String(status), headers: {}, config } as any;
    if (ok) return response;
    const error: any = new Error(`Request failed with status code ${status}`);
    error.isAxiosError = true;
    error.config = config;
    error.response = response;
    throw error;
  };
  return asked;
}

/** One GET; the transform rejects a non-ok answer, so report the outcome instead of throwing. */
async function ask(api: Api, path: string): Promise<string> {
  return api.apiSauceInstance.get(path).then(
    () => 'resolved',
    (e: any) => `rejected:${e?.status}`,
  );
}

async function main() {
  // --- where a restored session belongs ---------------------------------
  await check('a token with a learner profile goes to the learner home', () => {
    assert.equal(startRoute({ accessToken: 't', profile: learner }), LEARNER_HOME_ROUTE);
    assert.equal(LEARNER_HOME_ROUTE, '/home');
  });

  await check('a token with a teacher profile goes to the teacher dashboard', () => {
    assert.equal(startRoute({ accessToken: 't', profile: teacher }), TEACHER_HOME_ROUTE);
    assert.equal(TEACHER_HOME_ROUTE, '/teacher/dashboard');
  });

  await check('no token goes to login, with or without a remembered profile', () => {
    assert.equal(startRoute({ accessToken: null, profile: learner }), LOGIN_ROUTE);
    assert.equal(startRoute({ accessToken: '', profile: teacher }), LOGIN_ROUTE);
    assert.equal(startRoute({ accessToken: undefined, profile: undefined }), LOGIN_ROUTE);
  });

  await check('a token with no profile cannot be placed: login', () => {
    assert.equal(startRoute({ accessToken: 't', profile: undefined }), LOGIN_ROUTE);
    assert.equal(startRoute({ accessToken: 't', profile: null }), LOGIN_ROUTE);
  });

  await check('sign-in and restore share one rule: only role 4 is a learner', () => {
    assert.equal(routeForProfile({ schooluserrole: 4 }), LEARNER_HOME_ROUTE);
    for (const role of [1, 2, 3, 5, 0]) {
      assert.equal(routeForProfile({ schooluserrole: role }), TEACHER_HOME_ROUTE, `role ${role}`);
    }
  });

  await check('only a cold start\'s entry routes may be moved on', () => {
    for (const p of ['/', '/login', '', undefined, null]) assert.equal(isEntryPath(p as any), true, String(p));
    for (const p of ['/home', '/home/subjects', '/teacher/dashboard', '/library']) {
      assert.equal(isEntryPath(p), false, p);
    }
  });

  // --- the guard: nobody signed in, on a protected path -------------------
  await check('no token on a protected path needs login (a tab opened on /home, a late navigation after eviction)', () => {
    for (const p of ['/home', '/home/subjects', '/home/result', '/library', '/profile', '/progress', '/teacher/dashboard']) {
      assert.equal(needsLogin({ accessToken: '', pathname: p }), true, p);
      assert.equal(needsLogin({ accessToken: null, pathname: p }), true, p);
      assert.equal(needsLogin({ accessToken: undefined, pathname: p }), true, p);
    }
  });

  await check('a signed-in user never needs login, wherever they are', () => {
    for (const p of ['/home', '/home/result', '/teacher/dashboard', '/login', '/']) {
      assert.equal(needsLogin({ accessToken: 't', pathname: p }), false, p);
    }
  });

  await check('no token on an entry route, or before the path is known, does not need login (no loop with the redirect to login)', () => {
    for (const p of ['/login', '/', '', undefined, null]) {
      assert.equal(needsLogin({ accessToken: '', pathname: p }), false, String(p));
    }
  });

  await check('the developer tools stay reachable signed out', () => {
    for (const p of ['/gallery', '/kit-gallery', '/drag-lab']) {
      assert.equal(needsLogin({ accessToken: '', pathname: p }), false, p);
    }
  });

  await check('the profile in a token is read like sign-in reads it; anything else is undefined', () => {
    const payload = (o: unknown) => `h.${Buffer.from(JSON.stringify(o)).toString('base64url')}.s`;
    assert.equal(profileFromToken(payload({ schooluserrole: 4, schooluserid: 'x' }))?.schooluserrole, 4);
    assert.equal(profileFromToken(payload({ schooluserrole: 3 }))?.schooluserrole, 3);
    assert.equal(profileFromToken(payload({ name: 'no role' })), undefined);
    assert.equal(profileFromToken('not-a-token'), undefined);
    assert.equal(profileFromToken(''), undefined);
    assert.equal(profileFromToken('h.%%%.s'), undefined);
  });

  // --- the token decides who is signed in ----------------------------------
  const tokenFor = (o: unknown) => `h.${Buffer.from(JSON.stringify(o)).toString('base64url')}.s`;
  const learnerA: any = { schooluserid: 'u-learner', schooluserrole: 4, schoolusername: 'learner.a' };
  const teacherB: any = { schooluserid: 'u-teacher', schooluserrole: 3, schoolusername: 'teacher.b' };

  await check('a stored profile of another account loses to the token (another tab signed in as someone else)', () => {
    const profile = restoreProfile(tokenFor(learnerA), teacherB);
    assert.equal(profile?.schooluserid, 'u-learner');
    assert.equal(profile?.schooluserrole, 4);
    // and the route follows the token's account, not the stored one
    assert.equal(startRoute({ accessToken: 't', profile }), LEARNER_HOME_ROUTE);
    assert.equal(startRoute({ accessToken: 't', profile: restoreProfile(tokenFor(teacherB), learnerA) }), TEACHER_HOME_ROUTE);
  });

  await check('the stored profile of the same account is kept (it may carry richer fields)', () => {
    const rich = { ...learnerA, studentfirstname: 'Richer', city: 'x' };
    assert.equal(restoreProfile(tokenFor(learnerA), rich), rich);
  });

  await check('no stored profile: the token\'s own', () => {
    assert.equal(restoreProfile(tokenFor(teacherB), undefined)?.schooluserid, 'u-teacher');
  });

  await check('a token that cannot be read leaves the stored profile as it was', () => {
    assert.equal(restoreProfile('not-a-token', learnerA), learnerA);
    assert.equal(restoreProfile('not-a-token', undefined), undefined);
  });

  // --- how a session ends ------------------------------------------------
  await check('a session ends header first, then store, then token, then login', async () => {
    const calls: string[] = [];
    await endSession({
      clearAuthHeader: () => calls.push('header'),
      clearStore: () => calls.push('store'),
      clearStoredToken: async () => void calls.push('token'),
      goToLogin: () => calls.push('login'),
    });
    assert.deepEqual(calls, ['header', 'store', 'token', 'login']);
  });

  await check('login is reached even when clearing storage fails', async () => {
    const calls: string[] = [];
    await assert.rejects(
      endSession({
        clearAuthHeader: () => calls.push('header'),
        clearStore: () => calls.push('store'),
        clearStoredToken: async () => {
          throw new Error('keystore gone');
        },
        goToLogin: () => calls.push('login'),
      }),
    );
    assert.deepEqual(calls, ['header', 'store', 'login']);
  });

  // --- a token the server refuses ----------------------------------------
  // Wires the handler the way app/(app)/_layout.tsx does: it ends the session.
  function wired(api: Api) {
    const log: string[] = [];
    api.setUnauthorizedHandler(() =>
      endSession({
        clearAuthHeader: () => {
          api.clearAuthHeader();
          log.push('header');
        },
        clearStore: () => log.push('store'),
        clearStoredToken: async () => void log.push('token'),
        goToLogin: () => log.push('login'),
      }),
    );
    return log;
  }

  await check('a refused restored token clears the session and lands on login once', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    await ask(api, 'lesson/x');
    assert.deepEqual(log, ['header', 'store', 'token', 'login']);
  });

  await check('several refused requests in flight end the session once (no loop)', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    await Promise.all([
      ask(api, 'a'),
      ask(api, 'b'),
      ask(api, 'c'),
    ]);
    await ask(api, 'd'); // a call from the login screen's side, after the clear
    assert.equal(log.filter(x => x === 'login').length, 1, JSON.stringify(log));
  });

  await check('the client itself calls the handler once, even if the handler does not clear anything', async () => {
    const api = new Api();
    let calls = 0;
    api.setUnauthorizedHandler(() => void (calls += 1));
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    await Promise.all([ask(api, 'a'), ask(api, 'b'), ask(api, 'c')]);
    assert.equal(calls, 1);
  });

  await check('the refused request still fails for its caller, with status 401', async () => {
    const api = new Api();
    wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    const outcome = await ask(api, 'lesson/x');
    assert.equal(outcome, 'rejected:401');
  });

  await check('a 401 from sign-in itself is not a dead session', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    await api.apiSauceInstance.post('/auth/login', {}).catch(() => {});
    assert.deepEqual(log, []);
  });

  await check('a late 401 for an older token cannot end a newer session', async () => {
    const api = new Api();
    const log = wired(api);
    api.setHeaders({ authorization: 'Bearer old' });
    const gate: { release?: () => void } = {};
    const held = new Promise<void>(r => (gate.release = r));
    api.apiSauceInstance.axiosInstance.defaults.adapter = async config => {
      await held;
      const response = { data: {}, status: 401, statusText: '401', headers: {}, config } as any;
      const error: any = new Error('401');
      error.isAxiosError = true;
      error.config = config;
      error.response = response;
      throw error;
    };
    const inFlight = ask(api, 'slow');
    await new Promise(r => setTimeout(r, 10));
    api.setHeaders({ authorization: 'Bearer new' }); // signed in again meanwhile
    gate.release!();
    await inFlight;
    assert.deepEqual(log, []);
  });

  await check('offline is not a 401: the session survives and the handler is not called', async () => {
    const api = new Api();
    const log = wired(api);
    api.setHeaders({ authorization: 'Bearer restored' });
    // An adapter that throws with no `response`: what axios does with no network.
    // (axios still attaches the request config to that error.)
    api.apiSauceInstance.axiosInstance.defaults.adapter = async config => {
      throw Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK', config });
    };
    const outcome = await ask(api, 'lesson/x');
    assert.ok(outcome.startsWith('rejected'), outcome);
    assert.deepEqual(log, []);
    // The session is still there: a real 401 afterwards ends it.
    answerWith(api, 401);
    await ask(api, 'lesson/x');
    assert.deepEqual(log, ['header', 'store', 'token', 'login']);
  });

  await check('the session is forgotten before the handler runs, so a re-entrant refusal is ignored', async () => {
    const api = new Api();
    let calls = 0;
    let sawSessionInsideHandler: unknown = 'not called';
    api.setUnauthorizedHandler(() => {
      calls += 1;
      sawSessionInsideHandler = (api as any).sessionAuthorization;
      // Another refused answer arriving while the handler runs (same token).
      if (calls === 1) {
        (api as any).notifyUnauthorized({ config: { url: 'again', headers: { authorization: 'Bearer restored' } } });
      }
    });
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    await ask(api, 'a');
    assert.equal(sawSessionInsideHandler, undefined);
    assert.equal(calls, 1);
  });

  await check('a 401 with no session (nobody signed in) does nothing', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    await ask(api, 'org/branding');
    assert.deepEqual(log, []);
  });

  await check('a non-401 failure (403, 500) leaves the session alone', async () => {
    for (const status of [403, 404, 500]) {
      const api = new Api();
      const log = wired(api);
      answerWith(api, status);
      api.setHeaders({ authorization: 'Bearer restored' });
      await ask(api, 'x');
      assert.deepEqual(log, [], String(status));
    }
  });

  await check('after sign-out a new sign-in can be refused and ends the session again', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer one' });
    await ask(api, 'a');
    api.setHeaders({ authorization: 'Bearer two' });
    await ask(api, 'a');
    assert.equal(log.filter(x => x === 'login').length, 2, JSON.stringify(log));
  });

  console.log(`session: ${passed} checks passed`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
