// Pure rules for the Awards section of My progress (no React, no store), so
// they run under plain node (`yarn test:awards`).
import { resolveText, type ContentText } from '@/i18n/contentText';
import type {
  AwardElsewhere,
  AwardLevel,
  AwardsCurriculum,
  AwardsOverview,
  LevelRecognition,
  RawAwardsOverview,
} from '@/models';

/** Quiz share of a module's points that earns its award (server rule). */
export const AWARD_THRESHOLD_PERCENT = 80;

function num(value: unknown): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

/**
 * A level's points % for display: clamped to 0-100 (the server passes it
 * through uncapped, and it can be odd), rounded like the app's other
 * percentages (progress summary's toPercent): a value short of 100 never
 * reads 100, and a value above 0 never reads 0.
 */
export function displayPercent(progress: unknown): number {
  const n = Math.min(100, Math.max(0, num(progress)));
  const r = Math.round(n);
  if (n < 100 && r === 100) return 99;
  if (n > 0 && r === 0) return 1;
  return r;
}

const LEVEL_RECOGNITIONS: readonly string[] = ['none', 'award', 'certificate'];

/** Absent or unknown value (older server, newer server) reads as undefined. */
function levelRecognitionOf(raw: unknown): LevelRecognition | undefined {
  const value = (raw as { level?: unknown } | null | undefined)?.level;
  return typeof value === 'string' && LEVEL_RECOGNITIONS.includes(value)
    ? (value as LevelRecognition)
    : undefined;
}

/**
 * Whether the Level screen may promise a certificate: only when the level's
 * curriculum is set to certificate for levels. No overview cached, level or
 * curriculum not found, recognition absent or unknown all read false (the
 * plain lesson count). Matches on curriculum id, or on a level id inside it.
 */
export function certificateOnLevel(
  overview: AwardsOverview | null | undefined,
  ids: { curriculumId?: string | null; levelId?: string | null },
): boolean {
  const cur = overview?.curricula?.find(c =>
    ids.curriculumId
      ? c.curriculumId === ids.curriculumId
      : !!ids.levelId && c.levels.some(l => l.levelId === ids.levelId),
  );
  return cur?.levelRecognition === 'certificate';
}

export function normaliseAwardsOverview(
  studentId: string,
  raw: RawAwardsOverview,
  fetchedAt: number = Date.now(),
): AwardsOverview {
  const curricula: AwardsCurriculum[] = (raw?.curricula ?? []).map(cur => ({
    curriculumId: cur.curid,
    name: cur.curriculumname,
    levelRecognition: levelRecognitionOf(cur.recognition),
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
          gradeContentLanguage:
            grade.contentlanguage ?? level.contentlanguage ?? null,
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
): ContentText =>
  resolveText(base, translations, field, language, contentLanguage);

/**
 * The overview with every programme, grade and level name in the learner's
 * interface language where the server sent a current translation, else the
 * base text (the same resolveText the lesson content uses), plus the language
 * of each resolved text (`*Language`) so a Khmer name gets the Khmer font in
 * an English interface and the other way round. The stored overview stays raw,
 * so a language switch needs no refetch.
 */
export function localiseAwardsOverview(
  overview: AwardsOverview | undefined,
  language: string,
): AwardsOverview | undefined {
  if (!overview) return overview;
  return {
    ...overview,
    curricula: overview.curricula.map(c => {
      const name = pick(
        c.name,
        c.translations,
        'curriculumname',
        language,
        c.contentLanguage,
      );
      return {
        ...c,
        name: name.text,
        nameLanguage: name.language,
        levels: c.levels.map(l => {
          const levelName = pick(
            l.levelName,
            l.translations,
            'levelname',
            language,
            l.contentLanguage,
          );
          const gradeName = pick(
            l.gradeName,
            l.gradeTranslations,
            'gradename',
            language,
            l.gradeContentLanguage ?? l.contentLanguage,
          );
          return {
            ...l,
            levelName: levelName.text,
            levelNameLanguage: levelName.language,
            gradeName: gradeName.text,
            gradeNameLanguage: gradeName.language,
          };
        }),
      };
    }),
    earnedElsewhere: overview.earnedElsewhere.map(a => {
      const levelName = pick(
        a.levelName,
        a.translations,
        'levelname',
        language,
        a.contentLanguage,
      );
      const gradeName = pick(
        a.gradeName,
        a.translations,
        'gradename',
        language,
        a.contentLanguage,
      );
      const curriculumName = pick(
        a.curriculumName,
        a.translations,
        'curriculumname',
        language,
        a.contentLanguage,
      );
      return {
        ...a,
        levelName: levelName.text,
        levelNameLanguage: levelName.language,
        gradeName: gradeName.text,
        gradeNameLanguage: gradeName.language,
        curriculumName: curriculumName.text,
        curriculumNameLanguage: curriculumName.language,
      };
    }),
  };
}

// ------------------------------------------------------------ grouping

export interface EarnedAwardItem {
  kind: 'earned';
  awardId: string;
  levelId: string | null;
  levelName: string;
  levelNameLanguage?: string;
  /**
   * 1-based position among the levels the section SHOWS in its programme
   * (awardable or earned), the badge number.
   */
  number: number;
  earnedAt: string | null;
  approximate: boolean;
  elsewhere: boolean;
}

export interface UnearnedAwardItem {
  kind: 'unearned';
  levelId: string;
  levelName: string;
  levelNameLanguage?: string;
  number: number;
  progress: number;
}

export type AwardListItem = EarnedAwardItem | UnearnedAwardItem;

export interface AwardGroup {
  curriculumId: string | null;
  name: string;
  nameLanguage?: string;
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

/**
 * The levels of a programme the Awards section shows: earned ones (an award is
 * kept even when its level is no longer awardable) and awardable ones. The
 * badge number and "Module n of total" count only these, so a hidden
 * single-item tier never leaves a gap.
 */
function shownLevels(cur: AwardsCurriculum): AwardLevel[] {
  return cur.levels.filter(l => !!l.awardId || l.awardable);
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
export function buildAwardsView(
  overview: AwardsOverview | undefined,
): AwardsView {
  const groups: AwardGroup[] = [];
  (overview?.curricula ?? []).forEach(cur => {
    const earned: EarnedAwardItem[] = [];
    const unearned: UnearnedAwardItem[] = [];
    shownLevels(cur).forEach((level, i) => {
      if (level.awardId) {
        earned.push({
          kind: 'earned',
          awardId: level.awardId,
          levelId: level.levelId,
          levelName: level.levelName,
          levelNameLanguage: level.levelNameLanguage,
          number: i + 1,
          earnedAt: level.earnedAt,
          approximate: level.approximate,
          elsewhere: false,
        });
      } else {
        unearned.push({
          kind: 'unearned',
          levelId: level.levelId,
          levelName: level.levelName,
          levelNameLanguage: level.levelNameLanguage,
          number: i + 1,
          progress: level.progress,
        });
      }
    });
    groups.push({
      curriculumId: cur.curriculumId,
      name: cur.name,
      nameLanguage: cur.nameLanguage,
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
        nameLanguage: a.curriculumNameLanguage,
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
      levelNameLanguage: a.levelNameLanguage,
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
  levelNameLanguage?: string;
  curriculumId: string | null;
  curriculumName: string;
  curriculumNameLanguage?: string;
  gradeName: string;
  /** Position among the levels the section shows (0: earned elsewhere). */
  number: number;
  /** How many levels the section shows in that programme (0: earned elsewhere). */
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
    const shown = shownLevels(cur);
    const idx = shown.findIndex(l => l.awardId === awardId);
    if (idx >= 0) {
      const l = shown[idx];
      return {
        awardId,
        levelName: l.levelName,
        levelNameLanguage: l.levelNameLanguage,
        curriculumId: cur.curriculumId,
        curriculumName: cur.name,
        curriculumNameLanguage: cur.nameLanguage,
        gradeName: l.gradeName,
        number: idx + 1,
        totalInProgramme: shown.length,
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
      levelNameLanguage: e.levelNameLanguage,
      curriculumId: e.curriculumId,
      curriculumName: e.curriculumName,
      curriculumNameLanguage: e.curriculumNameLanguage,
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

/**
 * The badge colour slot of an award: the slot of the programme group the list
 * puts it in (grouped by curriculum id, name as the fallback), so the list,
 * the earned sheet and the detail screen always agree.
 */
export function awardColorIndex(
  overview: AwardsOverview | undefined,
  awardId: string,
): number {
  const group = buildAwardsView(overview).groups.find(g =>
    g.items.some(i => i.kind === 'earned' && i.awardId === awardId),
  );
  return group?.index ?? 0;
}

// ------------------------------------------------------------ dates

/**
 * "3 Oct 2026" in the learner's language, in the device's time zone (the
 * learner's own calendar day).
 */
const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatAwardDay(iso: string, language: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  // English is built by hand: newer ICU spells September "Sept" in en-GB, and
  // the design (and every other device) says "Sep".
  if (language !== 'km') {
    return `${date.getDate()} ${
      EN_MONTHS[date.getMonth()]
    } ${date.getFullYear()}`;
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

/** How far an award's `earnedat` may sit from the result's `starttime` (ms). */
export const RESULT_MATCH_WINDOW_MS = 2000;

/**
 * Awards a result earned. The server stores an award's `earnedat` from the
 * `starttime` the app sent with the result (the result's own date, never "now"),
 * so an award belongs to a result when it is not approximate and its `earnedat`
 * is within RESULT_MATCH_WINDOW_MS of that `starttime` as INSTANTS (not strings:
 * the column keeps whole seconds and the server reads it back as an ISO string,
 * so the two differ by up to half a second and may be written in another zone).
 * An award that arrived complete from an import, or an older one, never matches.
 */
export function awardsEarnedByResult(
  overview: AwardsOverview | undefined,
  resultStartMs: number,
  windowMs: number = RESULT_MATCH_WINDOW_MS,
): string[] {
  if (!Number.isFinite(resultStartMs)) return [];
  const ids: string[] = [];
  const consider = (
    awardId: string | null,
    earnedAt: string | null,
    approximate: boolean,
  ) => {
    if (!awardId || approximate || !earnedAt) return;
    const at = Date.parse(earnedAt);
    if (!Number.isFinite(at)) return;
    if (Math.abs(at - resultStartMs) <= windowMs) ids.push(awardId);
  };
  (overview?.curricula ?? []).forEach(c =>
    c.levels.forEach(l => consider(l.awardId, l.earnedAt, l.approximate)),
  );
  (overview?.earnedElsewhere ?? []).forEach(a =>
    consider(a.awardId, a.earnedAt, a.approximate),
  );
  return ids;
}

export interface SeenDecision {
  /** New persisted seen set. */
  seenAwardIds: string[];
  /** Award ids whose "Award earned" sheet should be queued. */
  sheetAwardIds: string[];
}

/**
 * The seen/new rule. `matchedIds` are the awards that a result the server
 * accepted earned (awardsEarnedByResult); nothing else is ever queued for a
 * sheet.
 *  - A sheet is queued only for a matched award that is not already seen.
 *  - First successful fetch for a learner (`prevSeen` null): every other award
 *    already there is marked seen (no sheet, no "New" chip), so backfilled
 *    awards never pop up. A matched award is left unseen, so it gets its
 *    sheet (and the chip until the sheet closes).
 *  - Later fetches: awards not in `prevSeen` simply carry the "New" chip until
 *    the sheet is closed or the detail opened.
 */
export function decideSeen(input: {
  prevSeen: string[] | null;
  awardIds: string[];
  matchedIds: string[];
}): SeenDecision {
  const { prevSeen, awardIds } = input;
  const matched = input.matchedIds.filter(id => awardIds.includes(id));
  if (prevSeen === null) {
    return {
      seenAwardIds: awardIds.filter(id => !matched.includes(id)),
      sheetAwardIds: matched,
    };
  }
  const seen = new Set(prevSeen);
  return {
    seenAwardIds: prevSeen,
    sheetAwardIds: matched.filter(id => !seen.has(id)),
  };
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
