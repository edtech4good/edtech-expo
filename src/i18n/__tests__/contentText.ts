/**
 * Bilingual content: which text a learner sees (src/i18n/contentText.ts), the
 * typography language, the search match and the stamp that carries the
 * response's content language onto its rows. Khmer text in these cases is an
 * opaque run of code points of the Khmer block, never words.
 *
 * Plain script run by `tsx` (package.json `test:content`). Exits non-zero on
 * the first failed check.
 */
import assert from 'node:assert/strict';
import {
  baseLanguageOf,
  matchesContentText,
  normaliseLanguage,
  resolveText,
  textOf,
  translationKey,
  UNKNOWN_CONTENT_LANGUAGE,
} from '../contentText';
import { typographyLanguage } from '../typographyLanguage';
import { stampContentLanguage } from '../../transforms/ContentLanguage';

const khmer = (n: number, from: number): string =>
  String.fromCodePoint(...Array.from({ length: n }, (_, i) => from + i));
const KM1 = khmer(5, 0x1780);
const KM2 = khmer(6, 0x1790);

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

check('the translation for the interface language wins, in that language', () => {
  const row = { lessonname: 'Counting', contentlanguage: 'en', translations: { km: { lessonname: KM1 } } };
  assert.deepEqual(textOf(row, 'lessonname', undefined, 'km'), { text: KM1, language: 'km' });
});

check('no translation for the interface language: the base text, in the content language', () => {
  const row = { lessonname: 'Counting', contentlanguage: 'en', translations: { km: { lessonname: KM1 } } };
  assert.deepEqual(textOf(row, 'lessonname', undefined, 'en'), { text: 'Counting', language: 'en' });
});

check('a row with no translations key (an older cache, a token with no organisation): base text, language unknown', () => {
  const row = { lessonname: 'Counting' };
  assert.deepEqual(textOf(row, 'lessonname', undefined, 'km'), { text: 'Counting', language: UNKNOWN_CONTENT_LANGUAGE });
  assert.deepEqual(textOf({ lessonname: 'x', translations: null }, 'lessonname', undefined, 'km'), { text: 'x', language: 'unknown' });
});

check('translations without the field, or with another field only: the base text', () => {
  const row = { lessonname: 'Counting', contentlanguage: 'en', translations: { km: { lessondescription: KM1 } } };
  assert.deepEqual(textOf(row, 'lessonname', undefined, 'km'), { text: 'Counting', language: 'en' });
  assert.deepEqual(textOf({ ...row, translations: {} }, 'lessonname', undefined, 'km'), { text: 'Counting', language: 'en' });
});

check('an empty or blank translation never blanks a field that has base text', () => {
  for (const blank of ['', '   ', '\n']) {
    const row = { lessonname: 'Counting', contentlanguage: 'en', translations: { km: { lessonname: blank } } };
    assert.deepEqual(textOf(row, 'lessonname', undefined, 'km'), { text: 'Counting', language: 'en' }, JSON.stringify(blank));
  }
});

check('a translation of a field with no base text is still shown (never blank when there is text)', () => {
  const row = { lessonname: '', contentlanguage: 'en', translations: { km: { lessonname: KM1 } } };
  assert.deepEqual(textOf(row, 'lessonname', undefined, 'km'), { text: KM1, language: 'km' });
});

check('no base text and no translation: empty text, not a throw', () => {
  assert.deepEqual(textOf({ contentlanguage: 'en' }, 'lessonname', undefined, 'km'), { text: '', language: 'en' });
  assert.deepEqual(textOf(null, 'lessonname', undefined, 'km'), { text: '', language: 'unknown' });
  assert.deepEqual(textOf(undefined, 'lessonname', undefined, 'km'), { text: '', language: 'unknown' });
});

check('a subkey picks "<field>.<subkey>", by option id, and never the plain field', () => {
  const row = {
    questionoptiontext: 'seven',
    contentlanguage: 'en',
    translations: { km: { questionoptiontext: KM2, 'questionoptiontext.opt-b': KM1 } },
  };
  assert.deepEqual(textOf(row, 'questionoptiontext', 'opt-b', 'km'), { text: KM1, language: 'km' });
  assert.deepEqual(textOf(row, 'questionoptiontext', 'opt-a', 'km'), { text: 'seven', language: 'en' }, 'another option has no translation');
  assert.equal(translationKey('feedback', 'correctmessage'), 'feedback.correctmessage');
  assert.equal(translationKey('lessonname'), 'lessonname');
  assert.equal(translationKey('lessonname', ''), 'lessonname');
});

check('language codes are compared as the API keys them (primary subtag, lower case)', () => {
  assert.equal(normaliseLanguage('KM'), 'km');
  assert.equal(normaliseLanguage(' km-KH '), 'km');
  assert.equal(normaliseLanguage(undefined), '');
  const row = { lessonname: 'Counting', contentlanguage: 'EN-us', translations: { km: { lessonname: KM1 } } };
  assert.deepEqual(textOf(row, 'lessonname', undefined, 'KM'), { text: KM1, language: 'km' });
  assert.equal(baseLanguageOf(row), 'en');
  assert.equal(baseLanguageOf({ contentlanguage: null }), 'unknown');
  assert.equal(baseLanguageOf({ contentlanguage: '  ' }), 'unknown');
});

check('resolveText is textOf for a nested value', () => {
  assert.deepEqual(resolveText('seven', { km: { 'questionoptiontext.a': KM1 } }, 'questionoptiontext.a', 'km', 'en'), { text: KM1, language: 'km' });
  assert.deepEqual(resolveText('seven', undefined, 'questionoptiontext.a', 'km', 'en'), { text: 'seven', language: 'en' });
  assert.deepEqual(resolveText(null, { km: {} }, 'x', 'km', 'en'), { text: '', language: 'en' });
});

check('typography follows the text when the app has a font for its language, else the interface', () => {
  assert.equal(typographyLanguage('km', 'en'), 'km', 'Khmer text in an English interface');
  assert.equal(typographyLanguage('en', 'km'), 'en', 'Latin text in a Khmer interface');
  assert.equal(typographyLanguage(undefined, 'en'), 'en');
  assert.equal(typographyLanguage(undefined, 'km'), 'km');
  assert.equal(typographyLanguage('unknown', 'en'), 'en');
  assert.equal(typographyLanguage('th', 'km'), 'km');
  assert.equal(typographyLanguage(null, 'en'), 'en');
});

check('search matches the shown text and the base text it replaced', () => {
  const row = { curriculumname: KM1, textBase: { curriculumname: 'Business basics' } };
  assert.ok(matchesContentText(row, 'curriculumname', 'business'), 'by the base text');
  assert.ok(matchesContentText(row, 'curriculumname', KM1.slice(0, 2)), 'by the shown text');
  assert.ok(!matchesContentText(row, 'curriculumname', 'zzz'));
  assert.ok(matchesContentText(row, 'curriculumname', '   '), 'a blank query matches');
  assert.ok(matchesContentText({ curriculumname: 'Maths' }, 'curriculumname', 'MATH'), 'no textBase: shown text only, any case');
  assert.ok(!matchesContentText({}, 'curriculumname', 'x'));
  assert.ok(!matchesContentText(null, 'curriculumname', 'x'));
});

check('the data boundary stamps the response content language onto each row that has translations', () => {
  const body: any = {
    contentlanguage: 'en',
    data: {
      curricula: [
        { curriculumid: 'c', translations: {}, grades: [{ gradeid: 'g', translations: { km: { gradename: KM1 } }, levels: [{ levelid: 'l', translations: {} }] }] },
      ],
    },
  };
  stampContentLanguage(body);
  assert.equal(body.data.curricula[0].contentlanguage, 'en');
  assert.equal(body.data.curricula[0].grades[0].contentlanguage, 'en');
  assert.equal(body.data.curricula[0].grades[0].levels[0].contentlanguage, 'en');
  assert.equal(body.contentlanguage, 'en', 'the root is left as it was');
});

check('a row with no translations is not stamped; no contentlanguage at the root changes nothing; null is written as null', () => {
  const noKey: any = { data: [{ lessonid: 'l', translations: {} }] };
  stampContentLanguage(noKey);
  assert.ok(!('contentlanguage' in noKey.data[0]), 'a body without contentlanguage (no header, older server, no organisation)');
  const plain: any = { contentlanguage: 'en', data: [{ lessonid: 'l' }] };
  stampContentLanguage(plain);
  assert.ok(!('contentlanguage' in plain.data[0]), 'a row with no translations key');
  const none: any = { contentlanguage: null, data: [{ lessonid: 'l', translations: {} }] };
  stampContentLanguage(none);
  assert.equal(none.data[0].contentlanguage, null);
  for (const odd of [null, undefined, 'x', 3, [], { contentlanguage: 'en' }]) stampContentLanguage(odd);
});

console.log(`contentText: ${passed} checks passed`);
