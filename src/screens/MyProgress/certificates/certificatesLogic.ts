// Pure rules for the Certificates section of My progress and the certificate
// detail (no React, no store), so they run under plain node
// (`yarn test:certificates`).
import { resolveText } from '@/i18n/contentText';
import type {
  CertificateCurriculum,
  CertificateItem,
  CertificateReason,
  CertificateScope,
  CertificateStatus,
  CertificatesOverview,
  IssuedCertificate,
  RawCertificateItem,
  RawCertificatesOverview,
} from '@/models';
import { formatAwardDay } from '../awards/awardsLogic';

/** Quiz percentage that counts as a pass (the server's rule). */
export const CERTIFICATE_PASS_PERCENT = 80;

/** Most "what's left" lines a card shows; the rest become "and N more". */
export const MAX_REASON_LINES = 2;

const SCOPES: readonly string[] = ['level', 'grade', 'curriculum'];
const STATUSES: readonly string[] = ['issued', 'ready', 'not_yet', 'cant_check'];
const QUIZ_STATES: readonly string[] = ['below', 'not_taken', 'unverified'];

const text = (x: unknown): string => (typeof x === 'string' ? x : '');

function percentOf(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function reasonsOf(raw: RawCertificateItem['reasons']): CertificateReason[] {
  const out: CertificateReason[] = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!r || typeof r !== 'object') continue;
    if (r.reason === 'no_quizzes') {
      out.push({ kind: 'no_quizzes' });
      continue;
    }
    if (typeof r.state !== 'string' || !QUIZ_STATES.includes(r.state)) continue;
    out.push({
      kind: 'quiz',
      quizName: text(r.quiz?.name),
      state: r.state as 'below' | 'not_taken' | 'unverified',
      bestPercent: percentOf(r.bestpercent),
    });
  }
  return out;
}

function certificateOf(raw: RawCertificateItem['certificate']): IssuedCertificate | null {
  const id = text(raw?.certificateid);
  const code = text(raw?.shortcode);
  if (!id || !code) return null;
  const checkUrl = text(raw?.checkurl).trim();
  return {
    certificateId: id,
    code,
    issuedAt: text(raw?.issuedat),
    checkUrl: checkUrl === '' ? null : checkUrl,
  };
}

/**
 * The wire answer as the app keeps it. An item with a scope or status this app
 * does not know is dropped, an issued item with no certificate is dropped, and a
 * curriculum left with no items is dropped. An issued item with an empty name
 * (the server built it from a snapshot that carried none) is kept.
 */
export function normaliseCertificatesOverview(
  studentId: string,
  raw: RawCertificatesOverview,
  fetchedAt: number = Date.now(),
): CertificatesOverview {
  const curricula: CertificateCurriculum[] = [];
  for (const cur of Array.isArray(raw?.curricula) ? raw.curricula : []) {
    const curriculumId = text(cur?.curriculumid);
    if (!curriculumId) continue;
    const items: CertificateItem[] = [];
    for (const it of Array.isArray(cur.items) ? cur.items : []) {
      if (!it || typeof it !== 'object') continue;
      if (typeof it.scope !== 'string' || !SCOPES.includes(it.scope)) continue;
      if (typeof it.status !== 'string' || !STATUSES.includes(it.status)) continue;
      const scopeId = text(it.scopeid);
      if (!scopeId) continue;
      const certificate = it.status === 'issued' ? certificateOf(it.certificate) : null;
      if (it.status === 'issued' && !certificate) continue;
      items.push({
        scope: it.scope as CertificateScope,
        scopeId,
        name: text(it.name),
        tierLabel: text(it.tierlabel).trim() || null,
        status: it.status as CertificateStatus,
        reasons: it.status === 'issued' ? [] : reasonsOf(it.reasons),
        certificate,
        translations: it.translations ?? null,
        contentLanguage: it.contentlanguage ?? null,
      });
    }
    if (items.length === 0) continue;
    curricula.push({
      curriculumId,
      name: text(cur.curriculumname),
      translations: cur.translations ?? null,
      contentLanguage: cur.contentlanguage ?? null,
      items,
    });
  }
  return { studentId, curricula, fetchedAt };
}

// ------------------------------------------------------------ language

const FIELD: Record<CertificateScope, string> = {
  level: 'levelname',
  grade: 'gradename',
  curriculum: 'curriculumname',
};

/**
 * Programme and item names in the learner's interface language where the server
 * sent a current translation, else the base text, with each text's language (for
 * typography). The stored overview stays raw, so a language switch needs no refetch.
 */
export function localiseCertificatesOverview(
  overview: CertificatesOverview | undefined,
  language: string,
): CertificatesOverview | undefined {
  if (!overview) return overview;
  return {
    ...overview,
    curricula: overview.curricula.map(c => {
      const name = resolveText(c.name, c.translations, 'curriculumname', language, c.contentLanguage);
      return {
        ...c,
        name: name.text,
        nameLanguage: name.language,
        items: c.items.map(i => {
          const n = resolveText(i.name, i.translations, FIELD[i.scope], language, i.contentLanguage);
          return { ...i, name: n.text, nameLanguage: n.language };
        }),
      };
    }),
  };
}

// ------------------------------------------------------------ the view

export interface CertificateCard {
  key: string;
  curriculumName: string;
  curriculumNameLanguage?: string;
  item: CertificateItem;
}

export interface CertificatesView {
  /** Items in the server's order, grouped by programme. */
  groups: Array<{ curriculumId: string; name: string; nameLanguage?: string; items: CertificateItem[]; showHeading: boolean }>;
  earnedCount: number;
  /** No curricula or no items: the section is not shown at all. */
  hideSection: boolean;
}

export function buildCertificatesView(overview: CertificatesOverview | undefined): CertificatesView {
  const groups = (overview?.curricula ?? [])
    .filter(c => c.items.length > 0)
    .map(c => ({
      curriculumId: c.curriculumId,
      name: c.name,
      nameLanguage: c.nameLanguage,
      items: c.items,
      // A lone programme-level card already carries the programme's name.
      showHeading: !(c.items.length === 1 && c.items[0].scope === 'curriculum'),
    }));
  const earnedCount = groups.reduce(
    (n, g) => n + g.items.filter(i => i.status === 'issued').length,
    0,
  );
  return { groups, earnedCount, hideSection: groups.length === 0 };
}

/** Whether the section shows at all: nothing to show, or a server without the route, hides it. */
export function sectionVisible(
  overview: CertificatesOverview | undefined,
  unsupported: boolean,
): boolean {
  if (unsupported) return false;
  if (!overview) return true; // loading or load error: the section says so
  return !buildCertificatesView(overview).hideSection;
}

/** Every issued certificate id of the overview. */
export function issuedIds(overview: CertificatesOverview | undefined): string[] {
  return (overview?.curricula ?? []).flatMap(c =>
    c.items.flatMap(i => (i.certificate ? [i.certificate.certificateId] : [])),
  );
}

export function findCertificate(
  overview: CertificatesOverview | undefined,
  certificateId: string,
): { item: CertificateItem; curriculum: CertificateCurriculum } | undefined {
  for (const curriculum of overview?.curricula ?? []) {
    for (const item of curriculum.items) {
      if (item.certificate?.certificateId === certificateId) return { item, curriculum };
    }
  }
  return undefined;
}

// ------------------------------------------------------------ "what's left" wording

export interface ReasonLine {
  /** i18n key under `certificates.` */
  key: 'stillToDo' | 'notTaken' | 'unverified' | 'ready' | 'noQuizzes';
  params: Record<string, string | number>;
}

export function reasonLine(r: CertificateReason): ReasonLine {
  if (r.kind === 'no_quizzes') return { key: 'noQuizzes', params: {} };
  if (r.state === 'unverified') return { key: 'unverified', params: { quiz: r.quizName } };
  if (r.state === 'below' && r.bestPercent !== null) {
    return {
      key: 'stillToDo',
      params: { quiz: r.quizName, best: r.bestPercent, needs: CERTIFICATE_PASS_PERCENT },
    };
  }
  // not taken yet (also a "below" with no best score to quote)
  return { key: 'notTaken', params: { quiz: r.quizName } };
}

export interface ItemDetailLines {
  lines: ReasonLine[];
  /** How many reasons are not shown; 0 when all fit. */
  more: number;
}

/** What is left for a not-yet item, in at most MAX_REASON_LINES lines plus "and N more". */
export function itemLines(item: CertificateItem): ItemDetailLines {
  if (item.status === 'issued') return { lines: [], more: 0 };
  if (item.status === 'ready') return { lines: [{ key: 'ready', params: {} }], more: 0 };
  const all = item.reasons.map(reasonLine);
  return { lines: all.slice(0, MAX_REASON_LINES), more: Math.max(0, all.length - MAX_REASON_LINES) };
}

// ------------------------------------------------------------ seen / new

/**
 * The seen set after a fetch. The first fetch on a fresh device (null) marks
 * every issued certificate seen, so nothing found at install time reads New; a
 * later fetch leaves the set alone, so a newly issued certificate stays New
 * until it is opened.
 */
export function seenAfterFetch(prevSeen: string[] | null, issued: string[]): string[] {
  return prevSeen === null ? [...new Set(issued)] : prevSeen;
}

export function isNewCertificate(seen: string[] | null, certificateId: string): boolean {
  return seen !== null && !seen.includes(certificateId);
}

export function markCertificatesSeen(seen: string[] | null, ids: string[]): string[] {
  const set = new Set(seen ?? []);
  ids.forEach(id => set.add(id));
  return [...set];
}

// ------------------------------------------------------------ dates

/** "12 Nov 2026" in the interface language; '' for a missing or bad date. */
export function issuedDay(issuedAt: string, language: string): string {
  return issuedAt ? formatAwardDay(issuedAt, language) : '';
}

// ------------------------------------------------------------ Save PDF / Share link

export type CertificateActionNote = 'offline' | 'noLink' | null;

export interface CertificateActions {
  enabled: boolean;
  /** Short note under the buttons when disabled (key under `certificates.`) */
  note: CertificateActionNote;
  pdfUrl: string | null;
  shareUrl: string | null;
}

/**
 * Save PDF and Share link both need the public link and the internet. No link
 * (the organisation has not set certificate links up, or the value is not an
 * http(s) address) is the permanent reason and is said first; offline is the
 * passing one. The PDF address is the check address plus "/certificate".
 */
export function certificateActions(input: {
  isOffline: boolean;
  checkUrl: string | null | undefined;
}): CertificateActions {
  const base = (input.checkUrl ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/\S+$/i.test(base)) {
    return { enabled: false, note: 'noLink', pdfUrl: null, shareUrl: null };
  }
  if (input.isOffline) {
    return { enabled: false, note: 'offline', pdfUrl: null, shareUrl: null };
  }
  return { enabled: true, note: null, pdfUrl: `${base}/certificate`, shareUrl: base };
}
