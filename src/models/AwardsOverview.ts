// GET student/awards/overview (learning server, learner token). Raw shapes are
// the wire contract; normalise through normaliseAwardsOverview before the
// redux store or the UI sees them.

export type RawTranslations = Record<
  string,
  Record<string, string> | null | undefined
> | null;

export interface RawAward {
  studentawardid: string;
  earnedat: string | null;
  earnedat_approximate?: boolean | null;
}

export interface RawAwardsLevel {
  levelid: string;
  levelname: string;
  levelorder?: number | string | null;
  progress?: number | string | null;
  awardable?: boolean | null;
  award?: RawAward | null;
  translations?: RawTranslations;
  contentlanguage?: string | null;
}

export interface RawAwardsGrade {
  gradeid: string;
  gradename?: string | null;
  levels?: RawAwardsLevel[] | null;
  translations?: RawTranslations;
  contentlanguage?: string | null;
}

/** What a curriculum gives for completing a tier. Absent on older servers. */
export interface RawRecognition {
  level?: string | null;
  grade?: string | null;
  curriculum?: string | null;
}

export interface RawAwardsCurriculum {
  curid: string;
  curriculumname: string;
  recognition?: RawRecognition | null;
  grades?: RawAwardsGrade[] | null;
  translations?: RawTranslations;
  contentlanguage?: string | null;
}

// Same row shape as GET student/awards. The contract does not spell it out,
// so every field but the id is read defensively.
export interface RawEarnedElsewhere {
  studentawardid: string;
  levelid?: string | null;
  levelname?: string | null;
  curid?: string | null;
  curriculumname?: string | null;
  gradename?: string | null;
  earnedat?: string | null;
  earnedat_approximate?: boolean | null;
  /** One merged map: levelname, gradename, curriculumname per language. */
  translations?: RawTranslations;
  contentlanguage?: string | null;
}

export interface RawAwardsOverview {
  curricula?: RawAwardsCurriculum[] | null;
  earnedelsewhere?: RawEarnedElsewhere[] | null;
}

export interface AwardsOverviewResponse {
  data: RawAwardsOverview;
  error: boolean;
}

export interface AwardLevel {
  levelId: string;
  levelName: string;
  gradeName: string;
  levelOrder: number;
  /** points %, 0-100 */
  progress: number;
  awardable: boolean;
  /** studentawardid, or null when not earned */
  awardId: string | null;
  translations: RawTranslations;
  gradeTranslations: RawTranslations;
  contentLanguage: string | null;
  /** Language of the grade's base text (its own stamp, else the level's). */
  gradeContentLanguage: string | null;
  /** Set by localiseAwardsOverview: the language of the text now in levelName (typography). */
  levelNameLanguage?: string;
  /** Set by localiseAwardsOverview: the language of the text now in gradeName. */
  gradeNameLanguage?: string;
  /** ISO string; null when not earned (or the server sent none) */
  earnedAt: string | null;
  approximate: boolean;
}

export type LevelRecognition = 'none' | 'award' | 'certificate';

export interface AwardsCurriculum {
  curriculumId: string;
  name: string;
  /** Recognition for completing a level; undefined when the server sent none or an unknown value. */
  levelRecognition?: LevelRecognition;
  translations: RawTranslations;
  contentLanguage: string | null;
  /** Set by localiseAwardsOverview: the language of the text now in name. */
  nameLanguage?: string;
  /** Levels in the server's order (grade, then level order). */
  levels: AwardLevel[];
}

export interface AwardElsewhere {
  awardId: string;
  levelId: string | null;
  levelName: string;
  curriculumId: string | null;
  curriculumName: string;
  gradeName: string;
  translations: RawTranslations;
  contentLanguage: string | null;
  /** Set by localiseAwardsOverview: the language of the text now in levelName. */
  levelNameLanguage?: string;
  /** ...in curriculumName. */
  curriculumNameLanguage?: string;
  /** ...in gradeName. */
  gradeNameLanguage?: string;
  earnedAt: string | null;
  approximate: boolean;
}

export interface AwardsOverview {
  studentId: string;
  curricula: AwardsCurriculum[];
  earnedElsewhere: AwardElsewhere[];
  /** epoch ms of when this snapshot was fetched */
  fetchedAt: number;
}
