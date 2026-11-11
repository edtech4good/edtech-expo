// Pure rules for the Awards section of My progress (no React, no store), so
// they run under plain node (`yarn test:awards`).
import { resolveText } from '@/i18n/contentText';
import type {
  AwardElsewhere,
  AwardLevel,
  AwardsCurriculum,
  AwardsOverview,
  RawAwardsOverview,
} from '@/models';

/** Quiz share of a module's points that earns its award (server rule). */
export const AWARD_THRESHOLD_PERCENT = 80;

function num(value: unknown): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

export function normaliseAwardsOverview(
  studentId: string,
  raw: RawAwardsOverview,
  fetchedAt: number = Date.now(),
): AwardsOverview {
  const curricula: AwardsCurriculum[] = (raw?.curricula ?? []).map(cur => ({
    curriculumId: cur.curid,
    name: cur.curriculumname,
    translations: cur.translations ?? null,
    contentLanguage: cur.contentlanguage ?? null,
    levels: (cur.grades ?? []).flatMap(grade =>
      (grade.levels ?? []).map(
        (level): AwardLevel => ({
          levelId: level.levelid,
          levelName: level.levelname,
          gradeName: grade.gradename ?? '',
          levelOrder: num(level.levelorder),
          progress: Math.min(100, Math.max(0, num(level.progress))),
          awardable: level.awardable !== false,
          awardId: level.award?.studentawardid ?? null,
          translations: level.translations ?? null,
          gradeTranslations: grade.translations ?? null,
          contentLanguage: level.contentlanguage ?? null,
          earnedAt: level.award?.earnedat ?? null,
          approximate: !!level.award?.earnedat_approximate,
        }),
      ),
    ),
  }));
  const earnedElsewhere: AwardElsewhere[] = (raw?.earnedelsewhere ?? []).map(
    a => ({
      awardId: a.studentawardid,
      levelId: a.levelid ?? null,
      levelName: a.levelname ?? '',
      curriculumId: a.curid ?? null,
      curriculumName: a.curriculumname ?? '',
      gradeName: a.gradename ?? '',
      translations: a.translations ?? null,
      contentLanguage: a.contentlanguage ?? null,
      earnedAt: a.earnedat ?? null,
      approximate: !!a.earnedat_approximate,
    }),
  );
  return { studentId, curricula, earnedElsewhere, fetchedAt };
}

// ------------------------------------------------------------ language

const pick = (
  base: string,
  translations: AwardLevel['translations'],
  field: string,
  language: string,
  contentLanguage: string | null,
): string =>
  resolveText(base, translations, field, language, contentLanguage).text;

/**
 * The overview with every programme, grade and level name in the learner's
 * interface language where the server sent a current translation, else the
 * base text (the same resolveText the lesson content uses). The stored
 * overview stays raw, so a language switch needs no refetch.
 */
export function localiseAwardsOverview(
  overview: AwardsOverview | undefined,
  language: string,
): AwardsOverview | undefined {
  if (!overview) return overview;
  return {
    ...overview,
    curricula: overview.curricula.map(c => ({
      ...c,
      name: pick(c.name, c.translations, 'curriculumname', language, c.contentLanguage),
      levels: c.levels.map(l => ({
        ...l,
        levelName: pick(l.levelName, l.translations, 'levelname', language, l.contentLanguage),
        gradeName: pick(l.gradeName, l.gradeTranslations, 'gradename', language, l.contentLanguage),
      })),
    })),
    earnedElsewhere: overview.earnedElsewhere.map(a => ({
      ...a,
      levelName: pick(a.levelName, a.translations, 'levelname', language, a.contentLanguage),
      gradeName: pick(a.gradeName, a.translations, 'gradename', language, a.contentLanguage),
      curriculumName: pick(a.curriculumName, a.translations, 'curriculumname', language, a.contentLanguage),
    })),
  };
}

// ------------------------------------------------------------ grouping

export interface EarnedAwardItem {
  kind: 'earned';
  awardId: string;
  levelId: string | null;
  levelName: string;
  /** 1-based position of the level inside its programme (badge number). */
  number: number;
  earnedAt: string | null;
  approximate: boolean;
  elsewhere: boolean;
}

export interface UnearnedAwardItem {
  kind: 'unearned';
  levelId: string;
  levelName: string;
  number: number;
  progress: number;
}

export type AwardListItem = EarnedAwardItem | UnearnedAwardItem;

export interface AwardGroup {
  curriculumId: string | null;
  name: string;
  /** Position of the group in the overview (drives the badge colour). */
  index: number;
  earnedCount: number;
  /** earned + still-to-earn awardable levels */
  totalCount: number;
  items: AwardListItem[];
}

export interface AwardsView {
  groups: AwardGroup[];
  earnedTotal: number;
  toEarnTotal: number;
}

function time(iso: string | null): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
}

/**
 * Overview -> what the section draws. Per programme: earned awards newest
 * first, then the not-yet-earned awardable levels in the server's order. A
 * level that is not awardable and has no award is hidden; one with an award is
 * kept. Awards whose level is no longer live are listed under their
 * programme's name (the live group when the name or id matches, else a group
 * of their own after the live ones). Empty groups are dropped.
 */
export function buildAwardsView(overview: AwardsOverview | undefined): AwardsView {
  const groups: AwardGroup[] = [];
  (overview?.curricula ?? []).forEach(cur => {
    const earned: EarnedAwardItem[] = [];
    const unearned: UnearnedAwardItem[] = [];
    cur.levels.forEach((level, i) => {
      if (level.awardId) {
        earned.push({
          kind: 'earned',
          awardId: level.awardId,
          levelId: level.levelId,
          levelName: level.levelName,
          number: i + 1,
          earnedAt: level.earnedAt,
          approximate: level.approximate,
          elsewhere: false,
        });
      } else if (level.awardable) {
        unearned.push({
          kind: 'unearned',
          levelId: level.levelId,
          levelName: level.levelName,
          number: i + 1,
          progress: level.progress,
        });
      }
    });
    groups.push({
      curriculumId: cur.curriculumId,
      name: cur.name,
      index: groups.length,
      earnedCount: earned.length,
      totalCount: earned.length + unearned.length,
      items: [...earned, ...unearned],
    });
  });

  (overview?.earnedElsewhere ?? []).forEach(a => {
    let group = groups.find(
      g =>
        (a.curriculumId && g.curriculumId === a.curriculumId) ||
        (a.curriculumName && g.name === a.curriculumName),
    );
    if (!group) {
      group = {
        curriculumId: a.curriculumId,
        name: a.curriculumName,
        index: groups.length,
        earnedCount: 0,
        totalCount: 0,
        items: [],
      };
      groups.push(group);
    }
    group.items.push({
      kind: 'earned',
      awardId: a.awardId,
      levelId: a.levelId,
      levelName: a.levelName,
      number: 0,
      earnedAt: a.earnedAt,
      approximate: a.approximate,
      elsewhere: true,
    });
    group.earnedCount += 1;
    group.totalCount += 1;
  });

  // Earned first (newest first, ties keep their order), unearned after.
  groups.forEach(g => {
    const earned = g.items.filter(
      (i): i is EarnedAwardItem => i.kind === 'earned',
    );
    const rest = g.items.filter(i => i.kind === 'unearned');
    earned.sort((a, b) => time(b.earnedAt) - time(a.earnedAt));
    g.items = [...earned, ...rest];
  });

  const visible = groups.filter(g => g.items.length > 0);
  return {
    groups: visible,
    earnedTotal: visible.reduce((n, g) => n + g.earnedCount, 0),
    toEarnTotal: visible.reduce(
      (n, g) => n + g.items.filter(i => i.kind === 'unearned').length,
      0,
    ),
  };
}

export function allAwardIds(overview: AwardsOverview | undefined): string[] {
  const ids: string[] = [];
  (overview?.curricula ?? []).forEach(c =>
    c.levels.forEach(l => l.awardId && ids.push(l.awardId)),
  );
  (overview?.earnedElsewhere ?? []).forEach(a => ids.push(a.awardId));
  return ids;
}

export interface FoundAward {
  awardId: string;
  levelName: string;
  curriculumName: string;
  gradeName: string;
  number: number;
  totalInProgramme: number;
  progress: number | null;
  earnedAt: string | null;
  approximate: boolean;
}

export function findAward(
  overview: AwardsOverview | undefined,
  awardId: string,
): FoundAward | undefined {
  for (const cur of overview?.curricula ?? []) {
    const idx = cur.levels.findIndex(l => l.awardId === awardId);
    if (idx >= 0) {
      const l = cur.levels[idx];
      return {
        awardId,
        levelName: l.levelName,
        curriculumName: cur.name,
        gradeName: l.gradeName,
        number: idx + 1,
        totalInProgramme: cur.levels.length,
        progress: l.progress,
        earnedAt: l.earnedAt,
        approximate: l.approximate,
      };
    }
  }
  const e = (overview?.earnedElsewhere ?? []).find(a => a.awardId === awardId);
  if (e) {
    return {
      awardId,
      levelName: e.levelName,
      curriculumName: e.curriculumName,
      gradeName: e.gradeName,
      number: 0,
      totalInProgramme: 0,
      progress: null,
      earnedAt: e.earnedAt,
      approximate: e.approximate,
    };
  }
  return undefined;
}

// ------------------------------------------------------------ dates

/**
 * "3 Oct 2026" in the learner's language, in the device's time zone (the
 * learner's own calendar day).
 */
const EN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatAwardDay(iso: string, language: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  // English is built by hand: newer ICU spells September "Sept" in en-GB, and
  // the design (and every other device) says "Sep".
  if (language !== 'km') {
    return `${date.getDate()} ${EN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  try {
    return new Intl.DateTimeFormat('km-KH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
}

/**
 * Which sentence to use and its date: an exact date reads "Earned 3 Oct 2026",
 * an approximate one (an older award whose exact day was not recorded) reads
 * "Earned by 3 Oct 2026". Returns the i18n key (under `awards.`) and the
 * `{{date}}` value; a missing date gives the key `earnedNoDate`.
 */
export function earnedDateWording(
  earnedAt: string | null,
  approximate: boolean,
  language: string,
): { key: 'earned' | 'earnedBy' | 'earnedNoDate'; date: string } {
  const date = earnedAt ? formatAwardDay(earnedAt, language) : '';
  if (!date) return { key: 'earnedNoDate', date: '' };
  return { key: approximate ? 'earnedBy' : 'earned', date };
}

// ------------------------------------------------------------ seen / new

export interface SeenDecision {
  /** New persisted seen set (null only when nothing is known yet). */
  seenAwardIds: string[];
  /** Award ids whose "Award earned" sheet should show, oldest first. */
  sheetAwardIds: string[];
}

/**
 * The seen/new rule.
 *  - First fetch for a learner (`prevSeen` null): every award already there is
 *    marked seen and NO sheet shows, so backfilled awards never pop up, and
 *    they carry no "New" chip either.
 *  - Later fetches: awards not in `prevSeen` are new (chip). Only a fetch
 *    triggered by a result the server accepted ('result') queues the sheet
 *    for them; a plain refresh ('refresh') never does.
 *  - An award is marked seen when its sheet is closed or its detail is
 *    opened; merely scrolling past the Awards section does not.
 */
export function decideSeen(input: {
  prevSeen: string[] | null;
  prevSheet: string[];
  awardIds: string[];
  trigger: 'result' | 'refresh';
}): SeenDecision {
  const { prevSeen, prevSheet, awardIds, trigger } = input;
  if (prevSeen === null) {
    return { seenAwardIds: [...awardIds], sheetAwardIds: [] };
  }
  const seen = new Set(prevSeen);
  const unseen = awardIds.filter(id => !seen.has(id));
  const alreadyQueued = prevSheet.filter(id => awardIds.includes(id));
  const sheet =
    trigger === 'result'
      ? [...alreadyQueued, ...unseen.filter(id => !alreadyQueued.includes(id))]
      : alreadyQueued;
  return { seenAwardIds: prevSeen, sheetAwardIds: sheet };
}

/** Only a result the server has accepted (not left in the offline queue) can have earned an award. */
export function shouldCheckAwardsAfterResult(synced: boolean): boolean {
  return synced === true;
}

export function isNewAward(
  seenAwardIds: string[] | null,
  awardId: string,
): boolean {
  return seenAwardIds !== null && !seenAwardIds.includes(awardId);
}

export function markSeen(seen: string[] | null, ids: string[]): string[] {
  const set = new Set(seen ?? []);
  ids.forEach(id => set.add(id));
  return [...set];
}
