// Raw shape returned by GET student/progress/summary (rpi-api). One row per
// curriculum the student is enrolled in, plus totals across all of them.
// Every number can arrive as a string/null from SQL aggregates -- normalise
// everything through normaliseProgressSummary before it touches the redux
// store or the UI.
export interface RawProgressSummaryCurriculumLevel {
  levelid: string;
  levelname: string;
  gradeid: string;
  gradename: string;
  lessonsCompleted: number | string | null;
  lessonsTotal: number | string | null;
}

export interface RawProgressSummaryCurriculum {
  curriculumid: string;
  curriculumname: string;
  lessonsCompleted: number | string | null;
  lessonsTotal: number | string | null;
  levelsCompleted: number | string | null;
  levelsTotal: number | string | null;
  currentLevel: RawProgressSummaryCurriculumLevel | null;
}

export interface RawProgressSummaryTotals {
  lessonsCompleted: number | string | null;
  lessonsTotal: number | string | null;
  levelsCompleted: number | string | null;
  levelsTotal: number | string | null;
}

export interface RawProgressSummary {
  curricula: RawProgressSummaryCurriculum[];
  totals: RawProgressSummaryTotals;
}

// Normalised current-level snapshot within a curriculum row.
export interface CurriculumProgressLevel {
  levelId: string;
  levelName: string;
  gradeName: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  /** lessons, 0-100 integer */
  percent: number;
}

// Normalised per-curriculum progress row.
export interface CurriculumProgressRow {
  curriculumId: string;
  name: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  levelsCompleted: number;
  levelsTotal: number;
  /** lessons, 0-100 integer */
  percent: number;
  currentLevel: CurriculumProgressLevel | null;
}

// Normalised, persistable snapshot of a student's progress across every
// enrolled curriculum -- the last good result is cached per student so the
// dashboard still has something to show offline.
export interface ProgressSummary {
  studentId: string;
  curricula: CurriculumProgressRow[];
  lessonsCompleted: number;
  lessonsTotal: number;
  levelsCompleted: number;
  levelsTotal: number;
  overallPercent: number;
  levelsPercent: number;
  /** epoch ms of when this snapshot was fetched */
  fetchedAt: number;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isFinite(n) ? n : 0;
}

function toPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  const percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  // Rounding can hide the difference between "done" and "not quite done" at
  // the extremes (e.g. 199/200 rounds to 100%, 1/300 rounds to 0%), so clamp
  // those boundary cases back to 99/1 unless the total is actually reached.
  if (done < total && percent === 100) return 99;
  if (done > 0 && percent === 0) return 1;
  return percent;
}

function normaliseCurrentLevel(
  raw: RawProgressSummaryCurriculumLevel | null | undefined,
): CurriculumProgressLevel | null {
  if (!raw) return null;
  const lessonsCompleted = toNumber(raw.lessonsCompleted);
  const lessonsTotal = toNumber(raw.lessonsTotal);
  return {
    levelId: raw.levelid,
    levelName: raw.levelname,
    gradeName: raw.gradename,
    lessonsCompleted,
    lessonsTotal,
    percent: toPercent(lessonsCompleted, lessonsTotal),
  };
}

// Pure normaliser: raw rpi-api response -> ProgressSummary. `fetchedAt`
// defaults to Date.now() but is accepted as a param so callers/tests can
// pin it.
export function normaliseProgressSummary(
  studentId: string,
  raw: RawProgressSummary,
  fetchedAt: number = Date.now(),
): ProgressSummary {
  const curricula: CurriculumProgressRow[] = (raw?.curricula ?? []).map(
    curriculum => {
      const lessonsCompleted = toNumber(curriculum.lessonsCompleted);
      const lessonsTotal = toNumber(curriculum.lessonsTotal);
      return {
        curriculumId: curriculum.curriculumid,
        name: curriculum.curriculumname,
        lessonsCompleted,
        lessonsTotal,
        levelsCompleted: toNumber(curriculum.levelsCompleted),
        levelsTotal: toNumber(curriculum.levelsTotal),
        percent: toPercent(lessonsCompleted, lessonsTotal),
        currentLevel: normaliseCurrentLevel(curriculum.currentLevel),
      };
    },
  );

  const lessonsCompleted = toNumber(raw?.totals?.lessonsCompleted);
  const lessonsTotal = toNumber(raw?.totals?.lessonsTotal);
  const levelsCompleted = toNumber(raw?.totals?.levelsCompleted);
  const levelsTotal = toNumber(raw?.totals?.levelsTotal);

  return {
    studentId,
    curricula,
    lessonsCompleted,
    lessonsTotal,
    levelsCompleted,
    levelsTotal,
    overallPercent: toPercent(lessonsCompleted, lessonsTotal),
    levelsPercent: toPercent(levelsCompleted, levelsTotal),
    fetchedAt,
  };
}
