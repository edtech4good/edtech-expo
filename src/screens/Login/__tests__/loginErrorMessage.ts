/**
 * The sign-in error modal never shows a learner Api.ts's developer text
 * when the server can't be reached, and both languages carry the copy it
 * shows instead.
 *
 * Plain script run by `tsx` (package.json `test:login`).
 */
import assert from 'node:assert/strict';
import en from '../../../locales/en.json';
import km from '../../../locales/km.json';
import { loginErrorMessageKey } from '../loginErrorMessage';

// No response at all: every apisauce problem that means that.
for (const problem of ['NETWORK_ERROR', 'CONNECTION_ERROR', 'TIMEOUT_ERROR']) {
  assert.equal(
    loginErrorMessageKey({ problem }),
    'screen.login.cannotConnectError',
    `${problem} should show the localized can't-connect copy`,
  );
}

// A 429 keeps its own copy.
assert.equal(
  loginErrorMessageKey({ status: 429, problem: 'CLIENT_ERROR' }),
  'screen.login.tooManyAttemptsError',
);

// Answers the server did give keep the raw message path.
assert.equal(loginErrorMessageKey({ status: 400, problem: 'CLIENT_ERROR' }), undefined);
assert.equal(loginErrorMessageKey({ status: 500, problem: 'SERVER_ERROR' }), undefined);
assert.equal(loginErrorMessageKey({}), undefined);

// Both languages have the strings, and the Khmer is Khmer.
for (const key of ['cannotConnectError', 'tooManyAttemptsError'] as const) {
  const enText = (en.screen.login as Record<string, string>)[key];
  const kmText = (km.screen.login as Record<string, string>)[key];
  assert.ok(enText, `en.json is missing screen.login.${key}`);
  assert.ok(kmText, `km.json is missing screen.login.${key}`);
  assert.match(kmText, /[ក-៿]/, `km.json screen.login.${key} is not Khmer`);
  assert.notEqual(kmText, enText);
}

console.log('loginErrorMessage: all assertions passed');
