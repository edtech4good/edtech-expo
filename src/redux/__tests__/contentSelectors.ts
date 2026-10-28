/**
 * Bilingual content at the store: the slices keep the RAW rows (what the
 * persisted caches write to disk, translations included) and the selectors a
 * screen reads through return the overlay of the interface language. Proves:
 *  - the persisted copy of a cached lesson, library and selection holds both
 *    languages;
 *  - after a language switch the same state reads in the other language with
 *    no refetch (nothing dispatched);
 *  - a cache entry written before translations existed still renders;
 *  - a selector hands out the same object until the state or the language
 *    changes (useSelector would otherwise re-render forever).
 *
 * Plain script run by `tsx` (package.json `test:content`). Exits non-zero on
 * the first failed check.
 */
import assert from 'node:assert/strict';
import { courseSlice, CourseActions, getCourses } from '../slices/CourseSlice';
import { getSubjects, subjectSlice, SubjectActions } from '../slices/SubjectSlice';
import { getUnits, unitSlice, UnitActions } from '../slices/UnitSlice';
import { getLevel, levelSlice, LevelActions } from '../slices/LevelSlice';
import { getLesson, lessonSlice, LessonActions } from '../slices/LessonSlice';
import { getCachedLesson, lessonCacheSlice, LessonCacheActions } from '../slices/LessonCacheSlice';
import { getLibraryEntry, librarySlice, LibraryActions } from '../slices/LibrarySlice';
import {
  getModuleResource,
  getSelectedCourse,
  getSelectedLesson,
  getSelectedModule,
  getSelectedSubject,
  getSelectedUnit,
  selectionSlice,
  SelectionActions,
} from '../slices/SelectionSlice';
import { getSelectedLanguage } from '../slices/SettingSlice';
import {
  courseRow,
  KM,
  learningRow,
  lessonRow,
  libraryCurriculum,
  subjectRow,
  unitRow,
} from '../../transforms/__tests__/contentFixtures';

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

type Lang = 'en' | 'km';
const build = (language: Lang, now: Record<string, unknown> = {}): any => {
  const state: any = {
    setting: { language },
    subject: subjectSlice.reducer(undefined, SubjectActions.updateSubject([subjectRow(), { ...subjectRow(), curriculumid: 'c2' }])),
    course: courseSlice.reducer(undefined, CourseActions.updateCourse([courseRow()])),
    unit: unitSlice.reducer(undefined, UnitActions.updateUnit([unitRow()])),
    level: levelSlice.reducer(
      undefined,
      LevelActions.updateLevel({ lesson: [lessonRow()], level: unitRow(), level_has_quiz: false } as any),
    ),
    lesson: lessonSlice.reducer(undefined, LessonActions.updateLesson(lessonRow())),
    lessonCache: lessonCacheSlice.reducer(undefined, LessonCacheActions.cacheLesson(lessonRow() as any)),
    library: librarySlice.reducer(
      undefined,
      LibraryActions.updateLibrary({ ownerId: 'u1', curricula: [libraryCurriculum() as any], generatedAt: 'now' }),
    ),
    selection: [
      SelectionActions.selectSubject(subjectRow()),
      SelectionActions.selectCourse(courseRow()),
      SelectionActions.selectUnit(unitRow()),
      SelectionActions.selectLesson(lessonRow()),
      SelectionActions.selectModule(learningRow()),
      SelectionActions.updateModuleResource(learningRow()),
    ].reduce((s, a) => selectionSlice.reducer(s, a), undefined as any),
    ...now,
  };
  return state;
};

check('the interface language comes from the setting slice', () => {
  assert.equal(getSelectedLanguage(build('km')), 'km');
  assert.equal(getSelectedLanguage(build('en')), 'en');
});

check('subjects, courses, units: the shown text follows the language, the stored rows stay raw', () => {
  const km = build('km');
  assert.equal(getSubjects(km)[0].curriculumname, KM(1));
  assert.equal(getCourses(km)[0].gradename, KM(3));
  assert.equal(getUnits(km)[0].levelname, KM(4));
  assert.equal(km.subject.subjects[0].curriculumname, 'Business basics', 'the slice holds the base text');
  assert.ok(km.subject.subjects[0].translations.km, 'and the translations');
  const en = { ...km, setting: { language: 'en' } };
  assert.equal(getSubjects(en)[0].curriculumname, 'Business basics');
  assert.equal(getCourses(en)[0].gradename, 'Grade One');
  assert.equal(getUnits(en)[0].levelname, 'Level A');
});

check('the level screen state: its lessons and its level description', () => {
  const km = build('km');
  assert.equal(getLevel(km).lessons[0].lessonname, KM(9));
  assert.equal(getLevel(km).lessons[0].lessonlearnings[0].lessonlearningname, KM(6));
  assert.equal(getLevel(km).level?.levelname, KM(4));
  assert.equal(getLevel({ ...km, setting: { language: 'en' } }).lessons[0].lessonname, 'Counting');
  assert.equal(getLevel(km).hasQuiz, false);
});

check('the lesson on screen, and a cached lesson: shown in the new language after a switch, with nothing dispatched', () => {
  const km = build('km');
  assert.equal(getLesson(km)?.lessonname, KM(9));
  assert.equal(getCachedLesson('ls1')(km)?.lessonname, KM(9));
  assert.equal(getCachedLesson('ls1')(km)?.lessonpractices[0].lessonpracticename, KM(7));
  const en = { ...km, setting: { language: 'en' } };
  assert.equal(getLesson(en)?.lessonname, 'Counting');
  assert.equal(getCachedLesson('ls1')(en)?.lessonname, 'Counting');
  assert.equal(getCachedLesson('missing')(en), undefined);
  assert.equal(getCachedLesson(undefined)(en), undefined);
});

check('the persisted copy of the caches holds the raw rows with both languages (what redux-persist writes), and reads back the same', () => {
  const state = build('km');
  const persisted = JSON.parse(JSON.stringify({ lessonCache: state.lessonCache, library: state.library, selection: state.selection }));
  const lesson = persisted.lessonCache.byId.ls1;
  assert.equal(lesson.lessonname, 'Counting');
  assert.deepEqual(lesson.translations, { km: { lessonname: KM(9) } });
  assert.equal(lesson.contentlanguage, 'en');
  assert.equal(persisted.library.byUser.u1.curricula[0].grades[0].levels[0].translations.km.levelname, KM(4));
  const rehydrated = { ...state, ...persisted, setting: { language: 'en' } };
  assert.equal(getCachedLesson('ls1')(rehydrated)?.lessonname, 'Counting');
  assert.equal(getCachedLesson('ls1')({ ...rehydrated, setting: { language: 'km' } })?.lessonname, KM(9));
});

check('the library: curricula, grades and levels follow the language', () => {
  const km = build('km');
  const entry = getLibraryEntry('u1')(km)!;
  assert.equal(entry.curricula[0].curriculumname, KM(1));
  assert.equal(entry.curricula[0].grades[0].gradename, KM(3));
  assert.equal(entry.curricula[0].grades[0].levels[0].levelname, KM(4));
  assert.equal(entry.generatedAt, 'now');
  assert.equal(getLibraryEntry('u1')({ ...km, setting: { language: 'en' } })!.curricula[0].grades[0].levels[0].levelname, 'Level A');
  assert.equal(getLibraryEntry('nobody')(km), undefined);
  assert.equal(getLibraryEntry(null)(km), undefined);
});

check('a stored selection follows the language too', () => {
  const km = build('km');
  assert.equal(getSelectedSubject(km)?.curriculumname, KM(1));
  assert.equal(getSelectedCourse(km)?.gradename, KM(3));
  assert.equal(getSelectedUnit(km)?.levelname, KM(4));
  assert.equal(getSelectedLesson(km)?.lessonname, KM(9));
  assert.equal((getSelectedModule(km) as any)?.lessonlearningname, KM(6));
  assert.equal(getModuleResource(km)?.lessonlearningname, KM(6));
  const en = { ...km, setting: { language: 'en' } };
  assert.equal(getSelectedSubject(en)?.curriculumname, 'Business basics');
  assert.equal(getSelectedLesson(en)?.lessonname, 'Counting');
  assert.equal(getModuleResource(en)?.lessonlearningname, 'Watch the video');
});

check('a selection made from an overlaid row (a screen dispatches what it shows) is still overlaid correctly in the other language', () => {
  const shown = getSubjects(build('km'))[0]; // what SubjectSelectionScreen holds and dispatches
  const selection = selectionSlice.reducer(undefined, SelectionActions.selectSubject(shown));
  const persisted = JSON.parse(JSON.stringify(selection));
  assert.equal(getSelectedSubject({ setting: { language: 'km' }, selection: persisted } as any)?.curriculumname, KM(1));
  assert.equal(getSelectedSubject({ setting: { language: 'en' }, selection: persisted } as any)?.curriculumname, 'Business basics');
});

check('an older cache entry, written before translations existed, still renders (same object, no throw)', () => {
  const old = { lessonid: 'ls9', lessonname: 'Old lesson', lessonlearnings: [{ lessonlearningid: 'a', lessonlearningname: 'Old video' }] };
  const state: any = {
    setting: { language: 'km' },
    lessonCache: lessonCacheSlice.reducer(undefined, LessonCacheActions.cacheLesson(old as any)),
    library: librarySlice.reducer(
      undefined,
      LibraryActions.updateLibrary({ ownerId: 'u1', curricula: [{ curriculumid: 'c', curriculumname: 'Old', grades: [] } as any], generatedAt: 'then' }),
    ),
    subject: subjectSlice.reducer(undefined, SubjectActions.updateSubject([{ curriculumid: 'c', curriculumname: 'Old' }])),
    level: levelSlice.reducer(undefined, { type: 'none' }),
  };
  assert.equal(getCachedLesson('ls9')(state)?.lessonname, 'Old lesson');
  assert.equal(getCachedLesson('ls9')(state)?.lessonlearnings[0].lessonlearningname, 'Old video');
  assert.equal(getLibraryEntry('u1')(state)!.curricula[0].curriculumname, 'Old');
  assert.equal(getSubjects(state)[0].curriculumname, 'Old');
  assert.equal(getLevel(state).lessons.length, 0);
});

check('a failed fetch that left a slice undefined does not throw (updateSubject(undefined))', () => {
  const state: any = { setting: { language: 'km' }, subject: { subjects: undefined } };
  assert.equal(getSubjects(state), undefined);
});

check('selectors return the same object until the state or the language changes', () => {
  const km = build('km');
  assert.equal(getSubjects(km), getSubjects(km));
  assert.equal(getLevel(km), getLevel(km));
  assert.equal(getLesson(km), getLesson(km));
  assert.equal(getCachedLesson('ls1')(km), getCachedLesson('ls1')(km));
  assert.equal(getLibraryEntry('u1')(km), getLibraryEntry('u1')(km));
  assert.equal(getSelectedLesson(km), getSelectedLesson(km));
  assert.notEqual(getSubjects(km), getSubjects({ ...km, setting: { language: 'en' } }));
  // a new state with the same slices (another slice changed) keeps the identity
  assert.equal(getSubjects(km), getSubjects({ ...km, other: 1 }));
});

console.log(`content selectors: ${passed} checks passed`);
