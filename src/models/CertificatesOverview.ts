// GET student/certificates/overview (learning server, learner token). Raw
// shapes are the wire contract; normalise through normaliseCertificatesOverview
// before the redux store or the UI sees them. Unknown statuses, scopes and
// reason states are ignored, so a newer server never breaks an older app.

export type RawCertTranslations = Record<
  string,
  Record<string, string> | null | undefined
> | null;

export interface RawCertReason {
  /** Present (as 'no_quizzes') on the "nothing to take yet" reason only. */
  reason?: string | null;
  quiz?: { id?: string | null; kind?: string | null; name?: string | null } | null;
  level?: { id?: string | null; name?: string | null } | null;
  lesson?: { id?: string | null; name?: string | null } | null;
  state?: string | null;
  bestpercent?: number | string | null;
}

export interface RawCertificate {
  certificateid?: string | null;
  shortcode?: string | null;
  issuedat?: string | null;
  checkurl?: string | null;
  classname?: string | null;
}

export interface RawCertificateItem {
  scope?: string | null;
  scopeid?: string | null;
  name?: string | null;
  tierlabel?: string | null;
  status?: string | null;
  reasons?: RawCertReason[] | null;
  quizcount?: number | string | null;
  passedcount?: number | string | null;
  certificate?: RawCertificate | null;
  translations?: RawCertTranslations;
  contentlanguage?: string | null;
}

export interface RawCertificateCurriculum {
  curriculumid?: string | null;
  curriculumname?: string | null;
  items?: RawCertificateItem[] | null;
  translations?: RawCertTranslations;
  contentlanguage?: string | null;
}

export interface RawCertificatesOverview {
  curricula?: RawCertificateCurriculum[] | null;
}

export interface CertificatesOverviewResponse {
  data: RawCertificatesOverview;
  error: boolean;
}

export type CertificateScope = 'level' | 'grade' | 'curriculum';
export type CertificateStatus = 'issued' | 'ready' | 'not_yet' | 'cant_check';

export type CertificateReason =
  | { kind: 'no_quizzes' }
  | {
      kind: 'quiz';
      quizName: string;
      state: 'below' | 'not_taken' | 'unverified';
      /** 0-100, null when the learner has no attempt */
      bestPercent: number | null;
    };

export interface IssuedCertificate {
  certificateId: string;
  code: string;
  /** ISO string; '' when the server sent none */
  issuedAt: string;
  /** Public check page; null when the organisation has no certificate links */
  checkUrl: string | null;
  /** The learner's class or cohort when the server sent one */
  className: string | null;
}

export interface CertificateItem {
  scope: CertificateScope;
  scopeId: string;
  name: string;
  /** The school's English label for the tier, when the server sent one. */
  tierLabel: string | null;
  status: CertificateStatus;
  reasons: CertificateReason[];
  certificate: IssuedCertificate | null;
  translations: RawCertTranslations;
  contentLanguage: string | null;
  /** Set by localiseCertificatesOverview: the language of the text now in name. */
  nameLanguage?: string;
}

export interface CertificateCurriculum {
  curriculumId: string;
  name: string;
  translations: RawCertTranslations;
  contentLanguage: string | null;
  /** Set by localiseCertificatesOverview. */
  nameLanguage?: string;
  items: CertificateItem[];
}

export interface CertificatesOverview {
  studentId: string;
  curricula: CertificateCurriculum[];
  /** epoch ms of when this snapshot was fetched */
  fetchedAt: number;
}
