// Raw shape returned by GET grade/progress/curriculum/:curriculumid (rpi-api,
// see edtech-lms-rpi-api src/business/grade.business.ts getusergradesprogess).
// `number_levels` is a SQL COUNT and can arrive as a string; `scores`/`points`
// can be null — normalise everything through normaliseCurriculumProgress
// before it touches the redux store or the UI.
export interface RawGradeProgress {
  gradeid: string;
  gradename: string;
  gradeorder: number;
  number_levels: number | string;
  number_completed_levels: number | string;
  studentgradesprogresses: Array<{
    points: number | null;
    completed: boolean | null;
    scores: number | null;
  }>;
}

export interface RawCurriculumProgress {
  gradesresult: RawGradeProgress[];
  total_points: number | null;
}

// Normalised per-grade progress used throughout the app.
export interface GradeProgress {
  gradeId: string;
  gradeName: string;
  gradeOrder: number;
  score: number;
  completedLevels: number;
  totalLevels: number;
}

// Normalised, persistable snapshot of a student's progress across every
// grade of one curriculum — the last good result is cached per curriculum
// so the dashboard still has something to show offline.
export interface CurriculumProgress {
  curriculumId: string;
  grades: GradeProgress[];
  totalPoints: number;
  completedLevels: number;
  totalLevels: number;
  /** epoch ms of when this snapshot was fetched */
  fetchedAt: number;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isFinite(n) ? n : 0;
}

// Pure normaliser: raw rpi-api response -> CurriculumProgress. `fetchedAt`
// defaults to Date.now() but is accepted as a param so callers/tests can
// pin it.
export function normaliseCurriculumProgress(
  curriculumId: string,
  raw: RawCurriculumProgress,
  fetchedAt: number = Date.now(),
): CurriculumProgress {
  const grades: GradeProgress[] = (raw.gradesresult ?? [])
    .map(grade => ({
      gradeId: grade.gradeid,
      gradeName: grade.gradename,
      gradeOrder: toNumber(grade.gradeorder),
      score: toNumber(grade.studentgradesprogresses?.[0]?.scores),
      completedLevels: toNumber(grade.number_completed_levels),
      totalLevels: toNumber(grade.number_levels),
    }))
    .sort((a, b) => a.gradeOrder - b.gradeOrder);

  const completedLevels = grades.reduce(
    (sum, grade) => sum + grade.completedLevels,
    0,
  );
  const totalLevels = grades.reduce((sum, grade) => sum + grade.totalLevels, 0);

  return {
    curriculumId,
    grades,
    totalPoints: toNumber(raw.total_points),
    completedLevels,
    totalLevels,
    fetchedAt,
  };
}
