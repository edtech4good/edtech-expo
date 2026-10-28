/**
 * Bilingual content: the overlay (design note "Bilingual content", section 3).
 *
 * Rows stay RAW in the redux slices and their persisted caches: the base text,
 * the `translations` the server sent and the `contentlanguage` stamped on by
 * the data boundary (transforms/ContentLanguage). The text a screen reads
 * (`lessonname`, `questionoptiontext`, ...) is the overlay of the interface
 * language over that raw row, computed where the row is read (the slice
 * selectors and the practice/quiz hooks), so switching the interface language
 * changes every screen with no refetch and no screen edit.
 *
 * An overlaid row has the same fields as the raw row, with the translated
 * text in place of the base text where there is a current translation, plus
 *   textLanguage  { [field]: 'km' | 'en' | 'unknown' | ... }  the language of
 *                 each overlaid string, for the typography;
 *   textBase      { [field]: text }  the base text a translation replaced.
 * Both are plain data on the row: an overlaid row that is stored (a selection)
 * or spread into a new object keeps what it needs to be overlaid again in
 * another language. A row that carries neither `translations` nor
 * `contentlanguage` (an older cache, a token with no organisation) is returned
 * unchanged.
 */
import { isAnswerBearingField } from '@/constants/ContentTranslations';
import {
  resolveText,
  translationKey,
  TranslatableRow,
} from '@/i18n/contentText';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Source {
  translations?: TranslatableRow['translations'];
  contentlanguage?: string | null;
  language: string;
}

interface Entry {
  /** The property of the object that holds the text. */
  field: string;
  /** The translation key when it is not `field` (`feedback.correctmessage` for the property `correctmessage`). */
  key?: string;
  subkey?: string;
  /** false: left as the base text (an answer-bearing field). */
  enabled?: boolean;
}

const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** True when the row carries something to overlay or an overlay to redo. */
const carries = (obj: Obj, source: Source): boolean =>
  isObj(source.translations) ||
  (source.contentlanguage !== undefined && source.contentlanguage !== null) ||
  isObj(obj.textBase);

/**
 * `obj` with the entries' text resolved against `source`. The base text of a
 * field is `obj.textBase[field]` when an earlier overlay replaced it, else
 * `obj[field]`.
 */
function withText(obj: Obj, source: Source, entries: Entry[]): Obj {
  if (!carries(obj, source)) return obj;
  const textBase: Obj = { ...(isObj(obj.textBase) ? obj.textBase : {}) };
  const textLanguage: Obj = { ...(isObj(obj.textLanguage) ? obj.textLanguage : {}) };
  const copy: Obj = { ...obj };
  let touched = false;
  for (const { field, key, subkey, enabled = true } of entries) {
    const current = obj[field];
    const base = field in textBase ? textBase[field] : current;
    if (typeof base !== 'string') continue;
    const resolved = enabled
      ? resolveText(base, source.translations, translationKey(key ?? field, subkey), source.language, source.contentlanguage)
      : resolveText(base, undefined, field, source.language, source.contentlanguage);
    copy[field] = resolved.text;
    textLanguage[field] = resolved.language;
    if (resolved.text !== base) textBase[field] = base;
    else delete textBase[field];
    touched = true;
  }
  if (!touched) return obj;
  if (Object.keys(textBase).length > 0) copy.textBase = textBase;
  else delete copy.textBase;
  copy.textLanguage = textLanguage;
  return copy;
}

/** A row that has its own `translations`: the fields that are plain columns. */
function overlayColumns(row: Obj, language: string, fields: string[]): Obj {
  return withText(row, { translations: row.translations, contentlanguage: row.contentlanguage, language }, fields.map(field => ({ field })));
}

// ---------------------------------------------------------------- hierarchy

export const CURRICULUM_FIELDS = ['curriculumname', 'curriculumdescription'];
export const GRADE_FIELDS = ['gradename', 'gradedescription'];
export const LEVEL_FIELDS = ['levelname', 'leveldescription'];
export const LESSON_FIELDS = ['lessonname', 'lessondescription'];
export const LEARNING_FIELDS = ['lessonlearningname', 'lessonlearningdescription'];
export const PRACTICE_FIELDS = ['lessonpracticename', 'lessonpracticedescription'];
export const QUIZ_FIELDS = ['lessonquizname', 'lessonquizdescription'];
export const PLAN_FIELDS = ['lessonplanname', 'lessonplandescription'];

/** curriculum/subjects row; also a library curriculum's own fields. */
export const overlaySubject = <T extends object>(row: T, language: string): T =>
  overlayColumns(row, language, CURRICULUM_FIELDS) as T;
/** grade/curriculum/:id row (a course). */
export const overlayCourse = <T extends object>(row: T, language: string): T =>
  overlayColumns(row, language, GRADE_FIELDS) as T;
/** level/grade/:id row (a unit) and the `level` of lesson/level/:id. */
export const overlayUnit = <T extends object>(row: T, language: string): T =>
  overlayColumns(row, language, LEVEL_FIELDS) as T;

/** A learning, practice or quiz entry of a lesson, or the learning of lesson/learning/:id. */
export const overlayLearning = <T extends object>(row: T, language: string): T =>
  overlayColumns(row, language, LEARNING_FIELDS) as T;
export const overlayPractice = <T extends object>(row: T, language: string): T =>
  overlayColumns(row, language, PRACTICE_FIELDS) as T;
export const overlayQuizItem = <T extends object>(row: T, language: string): T =>
  overlayColumns(row, language, QUIZ_FIELDS) as T;
export const overlayPlan = <T extends object>(row: T, language: string): T =>
  overlayColumns(row, language, PLAN_FIELDS) as T;

/**
 * A lesson (lesson/level/:id lists them, lesson/:id/learning returns one) and
 * the learnings, practices, quizzes and plans it lists, each with its own
 * translations.
 */
export function overlayLesson<T extends object>(row: T, language: string): T {
  const lesson = overlayColumns(row, language, LESSON_FIELDS);
  const next: Obj = { ...lesson };
  let changed = lesson !== row;
  const nest = (key: string, fn: (r: Obj, l: string) => Obj) => {
    const before = lesson[key];
    if (!Array.isArray(before)) return;
    const after = before.map((r: Obj) => (isObj(r) ? fn(r, language) : r));
    if (after.some((r, i) => r !== before[i])) {
      next[key] = after;
      changed = true;
    }
  };
  nest('lessonlearnings', overlayLearning);
  nest('lessonpractices', overlayPractice);
  nest('lessonquizzes', overlayQuizItem);
  nest('lessonplans', overlayPlan);
  return (changed ? next : row) as T;
}

/** level/library: curricula, their grades, their levels. */
export function overlayLibraryCurriculum<T extends object>(row: T, language: string): T {
  const curriculum = overlayColumns(row, language, CURRICULUM_FIELDS);
  if (!Array.isArray(curriculum.grades)) return curriculum as T;
  const grades = curriculum.grades.map((g: Obj) => {
    if (!isObj(g)) return g;
    const grade = overlayColumns(g, language, GRADE_FIELDS);
    if (!Array.isArray(grade.levels)) return grade;
    const levels = grade.levels.map((l: Obj) => (isObj(l) ? overlayColumns(l, language, LEVEL_FIELDS) : l));
    return levels.some((l: Obj, i: number) => l !== grade.levels[i]) ? { ...grade, levels } : grade;
  });
  return (grades.some((g: Obj, i: number) => g !== curriculum.grades[i]) ? { ...curriculum, grades } : curriculum) as T;
}

// ---------------------------------------------------------------- questions

/**
 * The text-bearing parts of one question-shaped object: the question itself
 * and its `questionobject` copy. Both are read by screens, so both are
 * overlaid from the question's own translations.
 */
function overlayQuestionShape(shape: Obj, source: Source, templatetypeid: unknown): Obj {
  let next = withText(shape, source, [
    { field: 'questiontext', enabled: !isAnswerBearingField(templatetypeid, 'questiontext') },
  ]);

  if (isObj(shape.questionheading)) {
    const heading = withText(shape.questionheading, source, [{ field: 'headingtext' }]);
    if (heading !== shape.questionheading) next = { ...next, questionheading: heading };
  }

  if (Array.isArray(shape.questionoptions)) {
    const optionsEnabled = !isAnswerBearingField(templatetypeid, 'questionoptiontext');
    const options = shape.questionoptions.map((option: Obj) => {
      if (!isObj(option)) return option;
      const id = option.questionoptionid;
      let o = withText(option, source, [{ field: 'questionoptiontext', subkey: id, enabled: optionsEnabled }]);
      if (isObj(option.questionassociate)) {
        const associate = withText(option.questionassociate, source, [{ field: 'questionassociatetext', subkey: id }]);
        if (associate !== option.questionassociate) o = { ...o, questionassociate: associate };
      }
      return o;
    });
    if (options.some((o: Obj, i: number) => o !== shape.questionoptions[i])) next = { ...next, questionoptions: options };
  }

  if (Array.isArray(shape.questiondistractors)) {
    const distractors = shape.questiondistractors.map((d: Obj) =>
      isObj(d) ? withText(d, source, [{ field: 'questiondistractortext', subkey: d.questiondistractorid }]) : d,
    );
    if (distractors.some((d: Obj, i: number) => d !== shape.questiondistractors[i])) next = { ...next, questiondistractors: distractors };
  }

  if (isObj(shape.questionfeedback)) {
    const feedback = withText(shape.questionfeedback, source, [
      { field: 'correctmessage', key: 'feedback', subkey: 'correctmessage' },
      { field: 'incorrectmessage', key: 'feedback', subkey: 'incorrectmessage' },
    ]);
    if (feedback !== shape.questionfeedback) next = { ...next, questionfeedback: feedback };
  }
  return next;
}

/**
 * A question as practice/quiz lists return it (`question` of each row):
 * stem, heading, option text (by option id), matching partners, distractors
 * (by distractor id) and the two feedback messages, on the question and on its
 * `questionobject`.
 */
export function overlayQuestion<T extends object>(question: T, language: string): T {
  const q = question as Obj;
  if (!isObj(q)) return question;
  const source: Source = { translations: q.translations, contentlanguage: q.contentlanguage, language };
  let next = overlayQuestionShape(q, source, q.templatetypeid);
  if (isObj(q.questionobject)) {
    const shape = overlayQuestionShape(q.questionobject, source, q.templatetypeid);
    if (shape !== q.questionobject) next = { ...next, questionobject: shape };
  }
  return next as T;
}

/** The `data` of question/practice/:id and question/quiz/:id: each row's question. */
export function overlayQuestionRows<T extends object>(rows: T[], language: string): T[] {
  return rows.map(row => {
    const question = (row as Obj).question;
    if (!isObj(question)) return row;
    const overlaid = overlayQuestion(question, language);
    return overlaid === question ? row : ({ ...row, question: overlaid } as T);
  });
}

// ------------------------------------------------------------------- memos

/**
 * `fn` memoised on the identity of its first argument, one result per
 * language, so a selector built on it hands `useSelector` the same object
 * until the raw row or the language changes.
 */
export function memoByRef<A extends object, R>(fn: (arg: A, language: string) => R) {
  const cache = new WeakMap<A, Map<string, R>>();
  return (arg: A, language: string): R => {
    let byLanguage = cache.get(arg);
    if (!byLanguage) {
      byLanguage = new Map();
      cache.set(arg, byLanguage);
    }
    if (byLanguage.has(language)) return byLanguage.get(language) as R;
    const result = fn(arg, language);
    byLanguage.set(language, result);
    return result;
  };
}

/** `overlay` applied to each item of a list, memoised per list and per item. */
export function memoList<T extends object>(overlay: (row: T, language: string) => T) {
  const one = memoByRef(overlay);
  return memoByRef((rows: T[], language: string): T[] => rows.map(row => (isObj(row) ? one(row, language) : row)));
}

// -------------------------------------------------------------- selectors

/** A list the store may hold as `undefined` (a failed fetch), overlaid and memoised. */
export function overlayRows<T extends object>(
  memo: (rows: T[], language: string) => T[],
  rows: T[] | undefined,
  language: string,
): T[] {
  return Array.isArray(rows) ? memo(rows, language) : (rows as unknown as T[]);
}

/** A single row the store may hold as `undefined`, overlaid and memoised. */
export function overlayOne<T extends object>(
  memo: (row: T, language: string) => T,
  row: T | undefined,
  language: string,
): T | undefined {
  return isObj(row) ? memo(row, language) : row;
}

/** A selected learning, practice or quiz: whichever name field the row has. */
export function overlayModule<T extends object>(row: T, language: string): T {
  const r = row as Obj;
  if ('lessonlearningid' in r) return overlayLearning(row, language);
  if ('lessonpracticeid' in r) return overlayPractice(row, language);
  if ('lessonquizid' in r) return overlayQuizItem(row, language);
  return row;
}

/**
 * The bilingual-content fields of a row (translations, content language, the
 * base text an overlay replaced, the language of each string), for a screen
 * that builds a new row from one (the Library builds the drill-down's Subject,
 * Course and Unit selections from a library row): spread this into the new
 * row so it can still be overlaid in another language.
 */
export function carryContent(row: object): Obj {
  const r = row as Obj;
  const out: Obj = {};
  for (const key of ['translations', 'contentlanguage', 'textBase', 'textLanguage']) {
    if (r[key] !== undefined) out[key] = r[key];
  }
  return out;
}
