/**
 * Rows as the student API sends them with X-Content-Translations: 1 (the
 * shape of its content-routes fixture), for the bilingual-content specs. The
 * organisation's base language is English; every Khmer text is an opaque run
 * of code points of the Khmer block (never words), different per call.
 */
export const khmer = (n: number, from: number): string =>
  String.fromCodePoint(...Array.from({ length: n }, (_, i) => from + i));
/** The n-th opaque Khmer run (distinct for distinct n). */
export const KM = (n: number): string => khmer(5, 0x1780 + n * 3);

export const OPT_A = '00000000-0000-4000-8000-0000000000a1';
export const OPT_B = '00000000-0000-4000-8000-0000000000a2';
export const OPT_C = '00000000-0000-4000-8000-0000000000a3';
export const DISTRACTOR = '00000000-0000-4000-8000-0000000000d1';

const option = (id: string, text: string, sequence: number, iscorrect: boolean, extra: Record<string, unknown> = {}) => ({
  questionoptionid: id,
  questionoptiontext: text,
  questionoptionsequence: sequence,
  questionoptioniscorrect: iscorrect,
  questionassociate: null,
  questionoptionfile: null,
  ...extra,
});

/** A row the way the data boundary leaves it: translations and the stamped content language. */
export const withKm = <T extends object>(row: T, km: Record<string, string>, contentlanguage: string | null = 'en') => ({
  ...row,
  contentlanguage,
  translations: { km },
});

export const subjectRow = () =>
  withKm(
    { curriculumid: 'c1', curriculumname: 'Business basics', curriculumdescription: 'Numbers and shapes', curriculumstatus: true, isdeleted: false, progress: 0, subjectid: 'c1' },
    { curriculumname: KM(1), curriculumdescription: KM(2) },
  );

export const courseRow = () =>
  withKm({ gradeid: 'g1', curriculumid: 'c1', gradename: 'Grade One', gradedescription: 'The first grade', gradeorder: 1 }, { gradename: KM(3) });

export const unitRow = () =>
  withKm({ levelid: 'lv1', gradeid: 'g1', levelname: 'Level A', leveldescription: 'An introduction', levelorder: 1 }, { levelname: KM(4), leveldescription: KM(5) });

export const learningRow = () =>
  withKm(
    { lessonlearningid: 'll1', lessonid: 'ls1', lessonlearningname: 'Watch the video', lessonlearningdescription: 'A short film', lessonlearningorder: 1, lessonlearningtype: 'video' },
    { lessonlearningname: KM(6) },
  );

export const lessonRow = () =>
  withKm(
    {
      lessonid: 'ls1',
      levelid: 'lv1',
      lessonname: 'Counting',
      lessondescription: 'Count to ten',
      lessonorder: 1,
      lessonlearnings: [learningRow()],
      lessonpractices: [
        withKm({ lessonpracticeid: 'pr1', lessonpracticename: 'Practice counting', lessonpracticeorder: 1 }, { lessonpracticename: KM(7) }),
      ],
      lessonquizzes: [withKm({ lessonquizid: 'qz1', lessonquizname: 'Counting quiz', lessonquizorder: 1 }, { lessonquizname: KM(8) })],
    },
    { lessonname: KM(9) },
  );

export const libraryCurriculum = () =>
  withKm(
    {
      curriculumid: 'c1',
      curriculumname: 'Business basics',
      curriculumdescription: null,
      progress: 0,
      grades: [
        withKm(
          {
            gradeid: 'g1',
            gradename: 'Grade One',
            gradeorder: 1,
            progress: 0,
            levels: [withKm({ levelid: 'lv1', levelname: 'Level A', leveldescription: 'An introduction', levelorder: 1, progress: 0, number_lessons: 2, number_completed_lessons: 0 }, { levelname: KM(4) })],
          },
          { gradename: KM(3) },
        ),
      ],
    },
    { curriculumname: KM(1) },
  );

/** A choice question (template 1) in the shape the practice route returns, with a `questionobject` copy. */
export const choiceQuestion = (templatetypeid = 1, km: Record<string, string> | null = null) => {
  const shape = () => ({
    questiontext: 'Which number is larger?',
    questionheading: { headingfile: null, headingtext: 'Larger' },
    questionoptions: [option(OPT_A, '7', 1, false), option(OPT_B, '12', 2, true), option(OPT_C, '9', 3, false)],
    questiondistractors: [],
    questionfeedback: { correctmessage: 'Well done', incorrectmessage: 'Try again' },
    questionfile: null,
  });
  const base = { questionid: 'q1', templatetypeid, ...shape(), questionobject: shape() };
  return km === null
    ? base
    : withKm(base, km);
};

/** What the server sends for the choice question when options B and C, the heading and the correct message are translated. */
export const CHOICE_KM = {
  headingtext: KM(11),
  [`questionoptiontext.${OPT_B}`]: KM(13),
  [`questionoptiontext.${OPT_C}`]: KM(14),
  'feedback.correctmessage': KM(15),
};

export const matchingQuestion = () => {
  const shape = () => ({
    questiontext: 'Match each word',
    questionheading: { headingfile: null, headingtext: 'Match' },
    questionoptions: [
      option(OPT_A, 'cat', 1, true, { questionassociate: { questionoptionid: OPT_A, questionassociatetext: 'animal', questionassociatefile: null } }),
      option(OPT_B, 'red', 2, true, { questionassociate: { questionoptionid: OPT_B, questionassociatetext: 'colour', questionassociatefile: null } }),
    ],
    questiondistractors: [{ questiondistractorid: DISTRACTOR, questiondistractortext: 'spare' }],
    questionfeedback: null,
  });
  return withKm(
    { questionid: 'q2', templatetypeid: 5, ...shape(), questionobject: shape() },
    {
      [`questionoptiontext.${OPT_A}`]: KM(20),
      [`questionassociatetext.${OPT_A}`]: KM(21),
      [`questionassociatetext.${OPT_B}`]: KM(22),
      [`questiondistractortext.${DISTRACTOR}`]: KM(23),
    },
  );
};
