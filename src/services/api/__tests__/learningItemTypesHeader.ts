/**
 * The capability header (design note "Learning items" §8): the student API
 * client sends `X-Learning-Item-Types` with the types this build renders;
 * the central client does not, and neither does the sample client.
 *
 * Plain script run by `tsx` (package.json `test:learningitems`), not jest. It
 * builds the real Api class and captures what each instance would put on the
 * wire by swapping axios's adapter, so a header set only on the wrong
 * instance, or set under another name, fails here. Exits non-zero on the
 * first failed check.
 */
import assert from 'node:assert/strict';

(globalThis as any).__DEV__ = false;
process.env.EXPO_PUBLIC_BASE_URL = 'http://student.test';
process.env.EXPO_PUBLIC_SYNC_URL = 'http://central.test';

import Api from '../Api';
import {
  LEARNING_ITEM_TYPES_HEADER,
  SUPPORTED_LEARNING_ITEM_TYPES,
  SUPPORTED_LEARNING_ITEM_TYPES_HEADER_VALUE,
} from '../../../constants/LearningItems';

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

/** Sends one GET through the instance and returns the headers axios would put on the wire. */
async function wireHeaders(
  instance: Api['apiSauceInstance'],
  path = 'lesson/x/learning',
): Promise<Record<string, string>> {
  let captured: Record<string, string> = {};
  instance.axiosInstance.defaults.adapter = async config => {
    // axios merges defaults.headers.common + method headers + per-request
    // headers at this point; flatten them the way the HTTP layer would.
    const h: any = config.headers;
    const flat = typeof h?.toJSON === 'function' ? h.toJSON() : { ...h };
    captured = Object.fromEntries(
      Object.entries(flat).map(([k, v]) => [k.toLowerCase(), String(v)]),
    );
    return {
      data: { data: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as any;
  };
  await instance.get(path);
  return captured;
}

const wire = LEARNING_ITEM_TYPES_HEADER.toLowerCase();

async function main() {
  await check('the value comes from the one constant', () => {
    assert.deepEqual([...SUPPORTED_LEARNING_ITEM_TYPES], ['video']);
    assert.equal(SUPPORTED_LEARNING_ITEM_TYPES_HEADER_VALUE, 'video');
    assert.equal(LEARNING_ITEM_TYPES_HEADER, 'X-Learning-Item-Types');
  });

  await check('the student API instance sends the header, value from the constant', async () => {
    const api = new Api();
    const headers = await wireHeaders(api.apiSauceInstance);
    assert.equal(headers[wire], SUPPORTED_LEARNING_ITEM_TYPES_HEADER_VALUE);
  });

  await check('the header survives setHeaders (sign-in sets the bearer token)', async () => {
    const api = new Api();
    api.setHeaders({ authorization: 'Bearer test-token' });
    const headers = await wireHeaders(api.apiSauceInstance);
    assert.equal(headers[wire], 'video');
    assert.equal(headers['authorization'], 'Bearer test-token');
  });

  await check('the header survives clearAuthHeader (sign-out)', async () => {
    const api = new Api();
    api.setHeaders({ authorization: 'Bearer test-token' });
    api.clearAuthHeader();
    const headers = await wireHeaders(api.apiSauceInstance);
    assert.equal(headers[wire], 'video');
    assert.equal(headers['authorization'], undefined);
  });

  await check('the central (lms) instance does NOT send the header', async () => {
    const api = new Api();
    const headers = await wireHeaders(api.lmsApiInstance);
    assert.equal(headers[wire], undefined);
    api.setHeaders({ authorization: 'Bearer test-token' });
    const after = await wireHeaders(api.lmsApiInstance);
    assert.equal(after[wire], undefined);
    assert.equal(after['authorization'], 'Bearer test-token');
  });

  await check('the sample instance does NOT send the header', async () => {
    const api = new Api();
    const headers = await wireHeaders(api.sampleInstance);
    assert.equal(headers[wire], undefined);
  });

  await check('a real student-API call (fetchChapters) goes out with the header', async () => {
    const api = new Api();
    let seen: Record<string, string> | undefined;
    let url: string | undefined;
    api.apiSauceInstance.axiosInstance.defaults.adapter = async config => {
      const h: any = config.headers;
      const flat = typeof h?.toJSON === 'function' ? h.toJSON() : { ...h };
      seen = Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k.toLowerCase(), String(v)]),
      );
      url = `${config.baseURL}/${config.url}`;
      return { data: { data: {} }, status: 200, statusText: 'OK', headers: {}, config } as any;
    };
    await api.fetchChapters('lesson-1');
    assert.ok(url?.startsWith('http://student.test'), String(url));
    assert.equal(seen?.[wire], 'video');
  });

  console.log(`learningItemTypesHeader: ${passed} checks passed`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
