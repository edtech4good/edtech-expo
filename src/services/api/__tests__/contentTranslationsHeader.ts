/**
 * Bilingual content: the student API client sends `X-Content-Translations: 1`
 * on every request (so the server adds `translations` to each content row and
 * `contentlanguage` to the response), the central client and the sample client
 * do not, and the content language the server names at the root of a response
 * is written onto the rows that carry translations.
 *
 * Plain script run by `tsx` (package.json `test:content`), not jest. It builds
 * the real Api class and captures what each instance would put on the wire by
 * swapping axios's adapter, as learningItemTypesHeader.ts does. Exits non-zero
 * on the first failed check.
 */
import assert from 'node:assert/strict';

(globalThis as any).__DEV__ = false;
process.env.EXPO_PUBLIC_BASE_URL = 'http://student.test';
process.env.EXPO_PUBLIC_SYNC_URL = 'http://central.test';

import Api from '../Api';
import {
  CONTENT_TRANSLATIONS_HEADER,
  CONTENT_TRANSLATIONS_HEADER_VALUE,
} from '../../../constants/ContentTranslations';

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

/** Sends one GET through the instance, answers `body`, returns the headers axios would put on the wire. */
async function wireHeaders(
  instance: Api['apiSauceInstance'],
  path = 'lesson/x/learning',
  body: unknown = { data: [] },
): Promise<Record<string, string>> {
  let captured: Record<string, string> = {};
  instance.axiosInstance.defaults.adapter = async config => {
    const h: any = config.headers;
    const flat = typeof h?.toJSON === 'function' ? h.toJSON() : { ...h };
    captured = Object.fromEntries(
      Object.entries(flat).map(([k, v]) => [k.toLowerCase(), String(v)]),
    );
    return { data: body, status: 200, statusText: 'OK', headers: {}, config } as any;
  };
  await instance.get(path);
  return captured;
}

const wire = CONTENT_TRANSLATIONS_HEADER.toLowerCase();

async function main() {
  await check('the header is X-Content-Translations: 1, from the one constant', () => {
    assert.equal(CONTENT_TRANSLATIONS_HEADER, 'X-Content-Translations');
    assert.equal(CONTENT_TRANSLATIONS_HEADER_VALUE, '1');
  });

  await check('the student API instance sends the header', async () => {
    const api = new Api();
    const headers = await wireHeaders(api.apiSauceInstance);
    assert.equal(headers[wire], CONTENT_TRANSLATIONS_HEADER_VALUE);
  });

  await check('the header survives setHeaders (sign-in) and clearAuthHeader (sign-out)', async () => {
    const api = new Api();
    api.setHeaders({ authorization: 'Bearer test-token' });
    assert.equal((await wireHeaders(api.apiSauceInstance))[wire], '1');
    api.clearAuthHeader();
    assert.equal((await wireHeaders(api.apiSauceInstance))[wire], '1');
  });

  await check('the learning-item header is still sent beside it', async () => {
    const headers = await wireHeaders(new Api().apiSauceInstance);
    assert.equal(headers['x-learning-item-types'], 'video');
  });

  await check('the central (lms) instance and the sample instance do NOT send it', async () => {
    const api = new Api();
    assert.equal((await wireHeaders(api.lmsApiInstance))[wire], undefined);
    api.setHeaders({ authorization: 'Bearer test-token' });
    assert.equal((await wireHeaders(api.lmsApiInstance))[wire], undefined);
    assert.equal((await wireHeaders(api.sampleInstance))[wire], undefined);
  });

  await check('every content call goes out with it (practice, quiz, lesson, library, subjects)', async () => {
    const api = new Api();
    const seen: Record<string, string> = {};
    api.apiSauceInstance.axiosInstance.defaults.adapter = async config => {
      const h: any = config.headers;
      const flat = typeof h?.toJSON === 'function' ? h.toJSON() : { ...h };
      seen[String(config.url)] = String(flat[CONTENT_TRANSLATIONS_HEADER] ?? flat[wire]);
      return { data: { data: [] }, status: 200, statusText: 'OK', headers: {}, config } as any;
    };
    await api.fetchSubjects();
    await api.fetchCourses('g');
    await api.fetchUnits('u');
    await api.fetchLibrary();
    await api.fetchLevels('l');
    await api.fetchChapters('c');
    await api.fetchVideoPath('v');
    await api.fetchPractice('p');
    await api.fetchQuiz('q');
    assert.equal(Object.keys(seen).length, 9, JSON.stringify(Object.keys(seen)));
    for (const [url, value] of Object.entries(seen)) assert.equal(value, '1', url);
  });

  await check('the content language at the root of a response is stamped onto each row that has translations', async () => {
    const api = new Api();
    const body = {
      contentlanguage: 'en',
      error: false,
      data: [{ curriculumid: 'c', curriculumname: 'x', translations: { km: { curriculumname: 'y' } } }],
    };
    api.apiSauceInstance.axiosInstance.defaults.adapter = async config =>
      ({ data: JSON.parse(JSON.stringify(body)), status: 200, statusText: 'OK', headers: {}, config }) as any;
    const response = await api.fetchSubjects();
    assert.equal((response.data as any).data[0].contentlanguage, 'en');
  });

  await check('a response with no content language (an older server, no organisation) is left as it came', async () => {
    const api = new Api();
    const body = { error: false, data: [{ curriculumid: 'c', curriculumname: 'x' }] };
    api.apiSauceInstance.axiosInstance.defaults.adapter = async config =>
      ({ data: JSON.parse(JSON.stringify(body)), status: 200, statusText: 'OK', headers: {}, config }) as any;
    const response = await api.fetchSubjects();
    assert.deepEqual(response.data, body);
  });

  console.log(`contentTranslationsHeader: ${passed} checks passed`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
