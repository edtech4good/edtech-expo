/**
 * Bilingual content, the overlay (src/transforms/Content.ts): one check group
 * per kind of content row the student API sends translations for, the
 * language-switch rules (raw rows stay raw, an overlaid row can be overlaid
 * again), and the older-cache rule (a row with no translations is returned as
 * it came).
 *
 * Plain script run by `tsx` (package.json `test:content`). Exits non-zero on
 * the first failed check.
 */
import assert from 'node:assert/strict';
import {
  carryContent,
  memoByRef,
  memoList,
  overlayCourse,
  overlayLearning,
  overlayLesson,
  overlayLibraryCurriculum,
  overlayModule,
  overlayQuestion,
  overlayQuestionRows,
  overlaySubject,
  overlayUnit,
} from '../Content';
import { fromQuestionDistractorToQuestionOption } from '../Practice';
import {
  choiceQuestion,
  CHOICE_KM,
  courseRow,
  DISTRACTOR,
  KM,
  learningRow,
  lessonRow,
  libraryCurriculum,
  matchingQuestion,
  OPT_A,
  OPT_B,
  OPT_C,
  subjectRow,
  unitRow,
  withKm,
} from './contentFixtures';

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
const frozen = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const optionText = (q: any, id: string, where: 'questionoptions' = 'questionoptions') =>
  q[where].find((o: any) => o.questionoptionid === id).questionoptiontext;

check('curriculum (curriculum/subjects): name and description, per language', () => {
  const raw = subjectRow();
  const km: any = overlaySubject(raw, 'km');
  assert.equal(km.curriculumname, KM(1));
  assert.equal(km.curriculumdescription, KM(2));
  assert.deepEqual(km.textLanguage, { curriculumname: 'km', curriculumdescription: 'km' });
  assert.equal(km.textBase.curriculumname, 'Business basics');
  const en: any = overlaySubject(raw, 'en');
  assert.equal(en.curriculumname, 'Business basics');
  assert.equal(en.curriculumdescription, 'Numbers and shapes');
  assert.deepEqual(en.textLanguage, { curriculumname: 'en', curriculumdescription: 'en' });
  assert.equal(en.textBase, undefined, 'nothing replaced, nothing to restore');
  assert.equal(raw.curriculumname, 'Business basics', 'the raw row is not touched');
});

check('grade (grade/curriculum/:id): the translated name, the untranslated description stays base text in the content language', () => {
  const km: any = overlayCourse(courseRow(), 'km');
  assert.equal(km.gradename, KM(3));
  assert.equal(km.gradedescription, 'The first grade');
  assert.deepEqual(km.textLanguage, { gradename: 'km', gradedescription: 'en' });
});

check('level (level/grade/:id, and the level of lesson/level/:id)', () => {
  const km: any = overlayUnit(unitRow(), 'km');
  assert.equal(km.levelname, KM(4));
  assert.equal(km.leveldescription, KM(5));
  assert.equal(overlayUnit(unitRow(), 'en').levelname, 'Level A');
});

check('lesson (lesson/level/:id, lesson/:id/learning): its own name and each learning, practice and quiz it lists, each with its own translations', () => {
  const km: any = overlayLesson(lessonRow(), 'km');
  assert.equal(km.lessonname, KM(9));
  assert.equal(km.lessonlearnings[0].lessonlearningname, KM(6));
  assert.equal(km.lessonpractices[0].lessonpracticename, KM(7));
  assert.equal(km.lessonquizzes[0].lessonquizname, KM(8));
  assert.equal(km.lessondescription, 'Count to ten');
  assert.equal(km.textLanguage.lessondescription, 'en');
  const en: any = overlayLesson(lessonRow(), 'en');
  assert.equal(en.lessonname, 'Counting');
  assert.equal(en.lessonlearnings[0].lessonlearningname, 'Watch the video');
  assert.equal(en.lessonpractices[0].lessonpracticename, 'Practice counting');
});

check('learning (lesson/learning/:id) and a selected module', () => {
  const km: any = overlayLearning(learningRow(), 'km');
  assert.equal(km.lessonlearningname, KM(6));
  const mod: any = overlayModule(learningRow(), 'km');
  assert.equal(mod.lessonlearningname, KM(6));
  const practice: any = overlayModule(lessonRow().lessonpractices[0], 'km');
  assert.equal(practice.lessonpracticename, KM(7));
  const quiz: any = overlayModule(lessonRow().lessonquizzes[0], 'km');
  assert.equal(quiz.lessonquizname, KM(8));
  const other = { foo: 'bar' };
  assert.equal(overlayModule(other, 'km'), other);
});

check('library (level/library): curricula, their grades, their levels, each with its own translations', () => {
  const km: any = overlayLibraryCurriculum(libraryCurriculum(), 'km');
  assert.equal(km.curriculumname, KM(1));
  assert.equal(km.curriculumdescription, null, 'a null description stays null');
  assert.equal(km.grades[0].gradename, KM(3));
  assert.equal(km.grades[0].levels[0].levelname, KM(4));
  assert.equal(km.grades[0].levels[0].leveldescription, 'An introduction');
  const en: any = overlayLibraryCurriculum(libraryCurriculum(), 'en');
  assert.equal(en.grades[0].levels[0].levelname, 'Level A');
});

check('practice/quiz question (question/practice/:id, question/quiz/:id): heading, option text by id, feedback; on the question and on its questionobject', () => {
  const rows: any[] = overlayQuestionRows([{ lessonpracticeid: 'pr1', questionid: 'q1', question: choiceQuestion(1, CHOICE_KM) }], 'km');
  const q = rows[0].question;
  for (const shape of [q, q.questionobject]) {
    assert.equal(shape.questionheading.headingtext, KM(11));
    assert.equal(optionText(shape, OPT_B), KM(13));
    assert.equal(optionText(shape, OPT_C), KM(14));
    assert.equal(optionText(shape, OPT_A), '7', 'no translation for this option: base text');
    assert.equal(shape.questionfeedback.correctmessage, KM(15));
    assert.equal(shape.questionfeedback.incorrectmessage, 'Try again');
    assert.equal(shape.questiontext, 'Which number is larger?', 'questiontext had no translation');
  }
  assert.equal(q.questionobject.questionheading.textLanguage.headingtext, 'km');
  assert.equal(q.questionobject.questionoptions.find((o: any) => o.questionoptionid === OPT_A).textLanguage.questionoptiontext, 'en');
  assert.equal(q.questionobject.questionfeedback.textLanguage.correctmessage, 'km');
  assert.equal(q.questionobject.questionfeedback.textLanguage.incorrectmessage, 'en');
  assert.equal(rows[0].lessonpracticeid, 'pr1', 'the row around the question is kept');
});

check('options are matched by id, not by position: a reordered list takes each translation to its own option', () => {
  const q: any = choiceQuestion(1, CHOICE_KM);
  q.questionoptions = [...q.questionoptions].reverse();
  q.questionobject.questionoptions = [...q.questionobject.questionoptions].reverse();
  const o: any = overlayQuestion(q, 'km');
  assert.deepEqual(o.questionobject.questionoptions.map((x: any) => x.questionoptionid), [OPT_C, OPT_B, OPT_A]);
  assert.deepEqual(o.questionobject.questionoptions.map((x: any) => x.questionoptiontext), [KM(14), KM(13), '7']);
  assert.deepEqual(o.questionobject.questionoptions.map((x: any) => x.questionoptioniscorrect), [false, true, false], 'the answer key is untouched');
});

check('matching partners and distractors are overlaid by option id and distractor id', () => {
  const q: any = overlayQuestion(matchingQuestion(), 'km');
  const a = q.questionobject.questionoptions.find((o: any) => o.questionoptionid === OPT_A);
  const b = q.questionobject.questionoptions.find((o: any) => o.questionoptionid === OPT_B);
  assert.equal(a.questionoptiontext, KM(20));
  assert.equal(a.questionassociate.questionassociatetext, KM(21));
  assert.equal(a.questionassociate.textLanguage.questionassociatetext, 'km');
  assert.equal(b.questionoptiontext, 'red');
  assert.equal(b.questionassociate.questionassociatetext, KM(22));
  assert.equal(q.questionobject.questiondistractors[0].questiondistractortext, KM(23));
  assert.equal(q.questiondistractors[0].questiondistractortext, KM(23));
  // a distractor used as a fill-in-the-blank tile keeps its text and its language
  const tiles: any[] = fromQuestionDistractorToQuestionOption(q.questionobject.questiondistractors);
  assert.equal(tiles[0].questionoptiontext, KM(23));
  assert.equal(tiles[0].questionoptionid, DISTRACTOR);
  assert.equal(tiles[0].textLanguage.questionoptiontext, 'km');
  assert.equal(fromQuestionDistractorToQuestionOption(overlayQuestion(matchingQuestion(), 'en').questionobject.questiondistractors)[0].questionoptiontext, 'spare');
});

check('answer-bearing fields are never overlaid, even if a payload carried a translation: template 21 option text and questiontext, 8 and 23 questiontext', () => {
  const km = { ...CHOICE_KM, questiontext: KM(30), [`questionoptiontext.${OPT_A}`]: KM(31) };
  const t21: any = overlayQuestion(choiceQuestion(21, km), 'km');
  assert.equal(t21.questiontext, 'Which number is larger?');
  assert.equal(optionText(t21.questionobject, OPT_A), '7');
  assert.equal(optionText(t21.questionobject, OPT_B), '12');
  assert.equal(t21.questionobject.questionheading.headingtext, KM(11), 'the heading is display text on every template');
  for (const template of [8, 23]) {
    const q: any = overlayQuestion(choiceQuestion(template, km), 'km');
    assert.equal(q.questiontext, 'Which number is larger?', `template ${template} questiontext`);
    assert.equal(optionText(q.questionobject, OPT_A), KM(31), `template ${template} option text is display text`);
  }
  const t1: any = overlayQuestion(choiceQuestion(1, km), 'km');
  assert.equal(t1.questiontext, KM(30), 'a choice question may translate its stem');
});

check('a language switch needs no refetch: the same raw row, overlaid again, gives the other language; an overlaid row overlays back', () => {
  const raw = choiceQuestion(1, CHOICE_KM);
  const km: any = overlayQuestion(raw, 'km');
  const back: any = overlayQuestion(km, 'en');
  assert.equal(optionText(back.questionobject, OPT_B), '12');
  assert.equal(back.questionobject.questionheading.headingtext, 'Larger');
  assert.equal(back.questionobject.questionfeedback.correctmessage, 'Well done');
  assert.equal(back.questionobject.questionoptions[1].textBase, undefined);
  const again: any = overlayQuestion(back, 'km');
  assert.deepEqual(again, km);
  // a stored selection: a lesson overlaid in km, persisted as JSON, then read in en
  const stored = frozen(overlayLesson(lessonRow(), 'km'));
  assert.equal((stored as any).lessonname, KM(9));
  assert.equal((overlayLesson(stored, 'en') as any).lessonname, 'Counting');
  assert.equal((overlayLesson(stored, 'en') as any).lessonlearnings[0].lessonlearningname, 'Watch the video');
});

check('a copy built from an overlaid row (the Library builds the drill-down selections) keeps what the next overlay needs', () => {
  const library: any = overlayLibraryCurriculum(libraryCurriculum(), 'km');
  const selection: any = { curriculumid: 'c1', curriculumname: library.curriculumname, curriculumdescription: '', ...carryContent(library) };
  assert.equal(selection.curriculumname, KM(1));
  assert.equal((overlaySubject(selection, 'en') as any).curriculumname, 'Business basics');
  assert.deepEqual(Object.keys(carryContent({ a: 1 })), []);
});

check('an older cache entry or a token with no organisation (no translations, no content language) is returned as it came, same object', () => {
  const lesson = { lessonid: 'l', lessonname: 'Counting', lessonlearnings: [{ lessonlearningid: 'a', lessonlearningname: 'Video' }] };
  assert.equal(overlayLesson(lesson, 'km'), lesson);
  const q = { questionid: 'q', templatetypeid: 1, questiontext: 'x', questionobject: { questionoptions: [{ questionoptionid: 'o', questionoptiontext: 'seven' }] } };
  assert.equal(overlayQuestion(q, 'km'), q);
  const rows = [{ lessonpracticequestionid: 'r', question: q }];
  assert.equal(overlayQuestionRows(rows, 'km')[0], rows[0]);
  const subject = { curriculumid: 'c', curriculumname: 'Maths' };
  assert.equal(overlaySubject(subject, 'km'), subject);
});

check('a row with translations={} (an organisation with none yet) keeps its text and names its language', () => {
  const row: any = overlaySubject({ curriculumid: 'c', curriculumname: 'Maths', contentlanguage: 'en', translations: {} }, 'km');
  assert.equal(row.curriculumname, 'Maths');
  assert.equal(row.textLanguage.curriculumname, 'en');
});

check('a row whose content language is null reads as unknown, and keeps its base text in any interface language', () => {
  const row: any = overlaySubject({ curriculumid: 'c', curriculumname: 'Maths', contentlanguage: null, translations: {} }, 'en');
  assert.equal(row.curriculumname, 'Maths');
  assert.equal(row.textLanguage.curriculumname, 'unknown');
});

check('a missing or null field and malformed nested values do not throw', () => {
  const q: any = { questionid: 'q', templatetypeid: 1, contentlanguage: 'en', translations: { km: {} }, questionoptions: null, questiondistractors: 'x', questionfeedback: null, questionheading: null, questionobject: null };
  assert.doesNotThrow(() => overlayQuestion(q, 'km'));
  assert.doesNotThrow(() => overlayQuestionRows([{ question: null } as any, { question: 'x' } as any], 'km'));
  assert.doesNotThrow(() => overlayLesson({ lessonid: 'l', lessonlearnings: 'x', contentlanguage: 'en', translations: {} } as any, 'km'));
});

check('selectors can hand out stable objects: the memo returns the same overlay until the raw row or the language changes', () => {
  const memo = memoByRef(overlaySubject);
  const raw = subjectRow();
  assert.equal(memo(raw, 'km'), memo(raw, 'km'));
  assert.notEqual(memo(raw, 'km'), memo(raw, 'en'));
  assert.equal(memo(raw, 'en'), memo(raw, 'en'));
  assert.notEqual(memo(subjectRow(), 'km'), memo(raw, 'km'));
  const list = memoList(overlaySubject);
  const rows = [raw, subjectRow()];
  assert.equal(list(rows, 'km'), list(rows, 'km'));
  assert.equal(list(rows, 'km')[0], list([rows[0]], 'km')[0], 'an item keeps its overlay when the list around it changes');
});

check('the overlay does not mutate a frozen raw row (the redux state is frozen)', () => {
  const deepFreeze = (o: any): any => {
    Object.values(o).forEach(v => typeof v === 'object' && v !== null && deepFreeze(v));
    return Object.freeze(o);
  };
  const lesson = deepFreeze(lessonRow());
  const q = deepFreeze(choiceQuestion(1, CHOICE_KM));
  assert.doesNotThrow(() => overlayLesson(lesson, 'km'));
  assert.doesNotThrow(() => overlayQuestion(q, 'km'));
});

console.log(`content overlay: ${passed} checks passed`);
