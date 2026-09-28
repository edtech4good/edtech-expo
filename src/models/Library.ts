// Shapes for GET level/library — every level the learner has access to,
// grouped by curriculum → grade. Deliberately separate from Curriculum.ts /
// Course.ts / Unit.ts (the subject→course→unit drill-down models): the
// library payload nests differently (curriculum contains grades contains
// levels, in one response) and some fields are nullable here where the
// drill-down equivalents are not (e.g. leveldescription).
export interface LibraryLevel {
  levelid: string;
  levelname: string;
  leveldescription: string | null;
  levelorder: number;
  progress: number;
  number_lessons: number;
  number_completed_lessons: number;
}

export interface LibraryGrade {
  gradeid: string;
  gradename: string;
  gradeorder: number;
  progress: number;
  levels: LibraryLevel[];
}

export interface LibraryCurriculum {
  curriculumid: string;
  curriculumname: string;
  curriculumdescription: string | null;
  progress: number;
  grades: LibraryGrade[];
}
