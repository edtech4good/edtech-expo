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
    await api.apiSauceInstance.get('lesson/x');
    assert.deepEqual(log, ['header', 'store', 'token', 'login']);
  });

  await check('several refused requests in flight end the session once (no loop)', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    await Promise.all([
      api.apiSauceInstance.get('a'),
      api.apiSauceInstance.get('b'),
      api.apiSauceInstance.get('c'),
    ]);
    await api.apiSauceInstance.get('d'); // a call from the login screen's side, after the clear
    assert.equal(log.filter(x => x === 'login').length, 1, JSON.stringify(log));
  });

  await check('the refused request still fails for its caller, with status 401', async () => {
    const api = new Api();
    wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer restored' });
    // responseTransform throws on a non-ok answer; apisauce hands that back as the rejection.
    const outcome = await api.apiSauceInstance.get('lesson/x').then(
      () => 'resolved',
      (e: any) => `rejected:${e?.status}`,
    );
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
    const inFlight = api.apiSauceInstance.get('slow');
    await new Promise(r => setTimeout(r, 10));
    api.setHeaders({ authorization: 'Bearer new' }); // signed in again meanwhile
    gate.release!();
    await inFlight;
    assert.deepEqual(log, []);
  });

  await check('a 401 with no session (nobody signed in) does nothing', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    await api.apiSauceInstance.get('org/branding').catch(() => {});
    assert.deepEqual(log, []);
  });

  await check('a non-401 failure (403, 500) leaves the session alone', async () => {
    for (const status of [403, 404, 500]) {
      const api = new Api();
      const log = wired(api);
      answerWith(api, status);
      api.setHeaders({ authorization: 'Bearer restored' });
      await api.apiSauceInstance.get('x');
      assert.deepEqual(log, [], String(status));
    }
  });

  await check('after sign-out a new sign-in can be refused and ends the session again', async () => {
    const api = new Api();
    const log = wired(api);
    answerWith(api, 401);
    api.setHeaders({ authorization: 'Bearer one' });
    await api.apiSauceInstance.get('a');
    api.setHeaders({ authorization: 'Bearer two' });
    await api.apiSauceInstance.get('a');
    assert.equal(log.filter(x => x === 'login').length, 2, JSON.stringify(log));
  });

  console.log(`session: ${passed} checks passed`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
