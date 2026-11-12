/**
 * Certificates in My progress: the overview normaliser, the "what's left"
 * wording (checked against the real en.json text), the seen/New rule, the Save
 * PDF / Share link state, the section's visibility (empty, 404), the fetch flow
 * and the persisted slice.
 *
 * Plain script run by `tsx` (package.json `test:certificates`). Imports only
 * pure modules and redux slices (no react-native). Exits non-zero on the first
 * failed check.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configureStore } from '@reduxjs/toolkit';
import type { RawCertificatesOverview } from '@/models';
import {
  certificatesSlice,
  CertificatesActions,
} from '../../../../redux/slices/CertificatesSlice';
import { clearAllData } from '../../../../redux/CommonAction';
import { persistWhitelist } from '../../../../redux/persistWhitelist';
import { combinedReducers } from '../../../../redux/CombinedReducers';
import { activeNavRouteName } from '../../../../constants/NavItems';
import {
  fetchCertificates,
  resetCertificatesFlowForTest,
  type CertificatesFetchEnv,
} from '../../../../services/certificatesFlow';
import {
  buildCertificatesView,
  certificateActions,
  findCertificate,
  isNewCertificate,
  issuedIds,
  itemLines,
  localiseCertificatesOverview,
  markCertificatesSeen,
  normaliseCertificatesOverview,
  sectionVisible,
  seenAfterFetch,
  type ReasonLine,
} from '../certificatesLogic';

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`ok   ${name}`);
    })
    .catch(err => {
      console.error(`FAIL ${name}`);
      throw err;
    });
}

// The English text the learner reads, from the real locale file.
const en = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/locales/en.json'), 'utf8'),
) as { certificates: Record<string, string> };
const say = (line: ReasonLine): string =>
  en.certificates[line.key].replace(/\{\{(\w+)\}\}/g, (_, k) => String(line.params[k]));
const sayMore = (n: number): string => en.certificates.andMore.replace('{{n}}', String(n));

const NOW = 1_700_000_000_000;
const quizReason = (name: string, state: string, best: number | null) => ({
  quiz: { id: `q-${name}`, kind: 'level', name },
  level: { id: 'l1', name: 'Module 1' },
  state,
  bestpercent: best,
});

const RAW: RawCertificatesOverview = {
  curricula: [
    {
      curriculumid: 'c1',
      curriculumname: 'Digital Skills for Small Business',
      items: [
        {
          scope: 'curriculum', scopeid: 'c1', name: 'Digital Skills for Small Business', tierlabel: 'Programme',
          status: 'issued', reasons: [], quizcount: 0, passedcount: 0,
          certificate: { certificateid: 'cert-1', shortcode: '7F3K-92QD', issuedat: '2026-11-12T08:00:00.000Z', checkurl: 'https://learn.example.org/v/7F3K-92QD' },
        },
        {
          scope: 'level', scopeid: 'l2', name: 'Module 2', status: 'not_yet', quizcount: 2, passedcount: 1,
          reasons: [quizReason('Module 2 quiz', 'below', 60)], certificate: null,
        },
        { scope: 'grade', scopeid: 'g9', name: 'Mystery', status: 'on_hold', reasons: [], certificate: null }, // unknown status
        { scope: 'cohort', scopeid: 'x', name: 'Mystery', status: 'ready', reasons: [], certificate: null }, // unknown scope
        { scope: 'level', scopeid: 'l3', name: 'Broken', status: 'issued', reasons: [], certificate: null }, // issued but no certificate
        {
          // the learner's record from a snapshot: its level is no longer live and the snapshot carried no name
          scope: 'level', scopeid: 'l-old', name: '', status: 'issued', reasons: [],
          certificate: { certificateid: 'cert-2', shortcode: 'AAAA-BBBB', issuedat: '2026-10-01T08:00:00.000Z', checkurl: null },
        },
      ],
    },
    { curriculumid: 'c2', curriculumname: 'Nothing usable', items: [{ scope: 'grade', scopeid: 'g', status: 'weird' }] },
  ],
};

(async () => {
  // ------------------------------------------------------------- (a) normaliser
  await check('a: issued and not-yet items kept, unknown status/scope and broken issued dropped', () => {
    const o = normaliseCertificatesOverview('s1', RAW, NOW);
    assert.equal(o.studentId, 's1');
    assert.equal(o.fetchedAt, NOW);
    assert.deepEqual(o.curricula.map(c => c.curriculumId), ['c1'], 'a curriculum with nothing usable is dropped');
    const items = o.curricula[0].items;
    assert.deepEqual(items.map(i => `${i.scope}:${i.scopeId}:${i.status}`), [
      'curriculum:c1:issued', 'level:l2:not_yet', 'level:l-old:issued',
    ]);
    const issued = items[0];
    assert.equal(issued.certificate!.certificateId, 'cert-1');
    assert.equal(issued.certificate!.code, '7F3K-92QD');
    assert.equal(issued.certificate!.checkUrl, 'https://learn.example.org/v/7F3K-92QD');
    assert.equal(issued.tierLabel, 'Programme');
    assert.equal(items[1].certificate, null);
    assert.deepEqual(items[1].reasons, [{ kind: 'quiz', quizName: 'Module 2 quiz', state: 'below', bestPercent: 60 }]);
  });

  await check('a: a snapshot-only issued item (no name, no link) is kept', () => {
    const o = normaliseCertificatesOverview('s1', RAW, NOW);
    const snap = o.curricula[0].items.find(i => i.scopeId === 'l-old')!;
    assert.equal(snap.name, '');
    assert.equal(snap.status, 'issued');
    assert.equal(snap.certificate!.checkUrl, null);
    assert.ok(findCertificate(o, 'cert-2'));
  });

  await check('a: defensive: junk bodies give an empty overview, unknown reason states are ignored', () => {
    for (const raw of [undefined, null, {}, { curricula: null }, { curricula: 'x' }, { curricula: [null, 5, {}] }] as never[]) {
      assert.deepEqual(normaliseCertificatesOverview('s1', raw, NOW).curricula, []);
    }
    const o = normaliseCertificatesOverview('s1', {
      curricula: [{ curriculumid: 'c', curriculumname: 'C', items: [
        { scope: 'level', scopeid: 'l', name: 'L', status: 'not_yet', certificate: { certificateid: 'ignored', shortcode: 'X' },
          reasons: [quizReason('A', 'martian', 10), quizReason('B', 'not_taken', null), { reason: 'no_quizzes' }, null as never] },
      ] }],
    }, NOW);
    const it = o.curricula[0].items[0];
    assert.equal(it.certificate, null, 'a certificate on a not-yet item is ignored');
    assert.deepEqual(it.reasons, [{ kind: 'quiz', quizName: 'B', state: 'not_taken', bestPercent: null }, { kind: 'no_quizzes' }]);
  });

  await check('a: names follow the interface language, base text otherwise', () => {
    const raw: RawCertificatesOverview = { curricula: [{
      curriculumid: 'c', curriculumname: 'Programme', contentlanguage: 'en' as never, translations: { km: { curriculumname: 'P-km' } },
      items: [{ scope: 'level', scopeid: 'l', name: 'Module', status: 'ready', contentlanguage: 'en', translations: { km: { levelname: 'M-km' } } }],
    }] };
    const o = normaliseCertificatesOverview('s1', raw, NOW);
    const km = localiseCertificatesOverview(o, 'km')!;
    assert.equal(km.curricula[0].name, 'P-km');
    assert.equal(km.curricula[0].items[0].name, 'M-km');
    const en2 = localiseCertificatesOverview(o, 'en')!;
    assert.equal(en2.curricula[0].items[0].name, 'Module');
    assert.equal(o.curricula[0].items[0].name, 'Module', 'the stored overview is untouched');
  });

  // ------------------------------------------------------------- (b) wording
  const item = (reasons: unknown[], status = 'not_yet') =>
    normaliseCertificatesOverview('s1', { curricula: [{ curriculumid: 'c', curriculumname: 'C', items: [
      { scope: 'curriculum', scopeid: 'c', name: 'C', status, reasons: reasons as never },
    ] }] }, NOW).curricula[0].items[0];

  await check('b: below, not taken, unverified, ready, no quizzes read in learner words', () => {
    assert.deepEqual(itemLines(item([quizReason('Module 2 quiz', 'below', 60)])).lines.map(say),
      ['Still to do: Module 2 quiz (best 60%, needs 80%)']);
    assert.deepEqual(itemLines(item([quizReason('Module 3 quiz', 'not_taken', null)])).lines.map(say),
      ['Module 3 quiz: not taken yet']);
    assert.deepEqual(itemLines(item([quizReason('Module 4 quiz', 'unverified', 85)], 'cant_check')).lines.map(say),
      ["Module 4 quiz: your pass wasn't checked by the server — take it again to count"]);
    assert.deepEqual(itemLines(item([], 'ready')).lines.map(say), ['Ready — your organisation will issue it']);
    assert.deepEqual(itemLines(item([{ reason: 'no_quizzes' }])).lines.map(say), ['No quizzes yet']);
  });

  await check('b: at most two lines, then "and N more"', () => {
    const three = itemLines(item([quizReason('A', 'below', 10), quizReason('B', 'not_taken', null), quizReason('C', 'below', 70)]));
    assert.equal(three.lines.length, 2);
    assert.equal(three.more, 1);
    assert.equal(sayMore(three.more), 'and 1 more');
    const five = itemLines(item([1, 2, 3, 4, 5].map(n => quizReason(`Q${n}`, 'not_taken', null))));
    assert.equal(five.lines.length, 2);
    assert.equal(sayMore(five.more), 'and 3 more');
    const two = itemLines(item([quizReason('A', 'below', 10), quizReason('B', 'below', 20)]));
    assert.equal(two.more, 0);
    assert.deepEqual(itemLines(item([], 'ready')).lines.length, 1);
  });

  await check('b: an issued item has no "what is left" lines', () => {
    const o = normaliseCertificatesOverview('s1', RAW, NOW);
    assert.deepEqual(itemLines(o.curricula[0].items[0]), { lines: [], more: 0 });
  });

  // ------------------------------------------------------------- (c) seen / new
  await check('c: first fetch marks existing issued seen; a later new certificate is New until opened', () => {
    const first = seenAfterFetch(null, ['cert-1', 'cert-2']);
    assert.deepEqual(first, ['cert-1', 'cert-2']);
    assert.ok(!isNewCertificate(first, 'cert-1'));
    // a later fetch brings cert-3: the set is left alone, so it is New
    const later = seenAfterFetch(first, ['cert-1', 'cert-2', 'cert-3']);
    assert.ok(isNewCertificate(later, 'cert-3'));
    // opening it marks it seen
    const opened = markCertificatesSeen(later, ['cert-3']);
    assert.ok(!isNewCertificate(opened, 'cert-3'));
    // unknown set (never fetched): nothing reads New
    assert.ok(!isNewCertificate(null, 'cert-3'));
    assert.deepEqual(markCertificatesSeen(null, ['a', 'a']), ['a']);
  });

  const realStore = () => configureStore({
    reducer: combinedReducers,
    middleware: gdm => gdm({ serializableCheck: false, immutableCheck: false }),
  });
  type TestStore = ReturnType<typeof realStore>;
  const okResponse = (raw: RawCertificatesOverview) => ({ ok: true, status: 200, data: { data: raw, error: false } });
  const makeEnv = (store: TestStore, fetchOverview: CertificatesFetchEnv['fetchOverview'], student = 's1'): CertificatesFetchEnv => ({
    fetchOverview,
    studentId: () => student,
    seenCertificateIds: id => store.getState().certificates.byStudent[id]?.seenCertificateIds ?? null,
    dispatch: a => store.dispatch(a as never),
    now: () => NOW,
  });
  const issuedRaw = (...ids: string[]): RawCertificatesOverview => ({
    curricula: [{ curriculumid: 'c', curriculumname: 'C', items: ids.map((id, n) => ({
      scope: 'level', scopeid: `l${n}`, name: `M${n}`, status: 'issued',
      certificate: { certificateid: id, shortcode: `CODE-${n}`, issuedat: '2026-11-12T08:00:00.000Z', checkurl: null },
    })) }],
  });

  await check('c: through the real fetch flow and store', async () => {
    resetCertificatesFlowForTest();
    const store = realStore();
    assert.equal(await fetchCertificates(makeEnv(store, async () => okResponse(issuedRaw('old')))), 'ok');
    let e = store.getState().certificates.byStudent.s1;
    assert.deepEqual(e.seenCertificateIds, ['old'], 'a fresh device: everything found is seen');
    assert.ok(!isNewCertificate(e.seenCertificateIds, 'old'));
    await fetchCertificates(makeEnv(store, async () => okResponse(issuedRaw('old', 'mine'))));
    e = store.getState().certificates.byStudent.s1;
    assert.ok(isNewCertificate(e.seenCertificateIds, 'mine'), 'issued later: New');
    assert.deepEqual(issuedIds(e.overview), ['old', 'mine']);
    store.dispatch(CertificatesActions.markCertificatesSeen({ studentId: 's1', ids: ['mine'] }));
    assert.ok(!isNewCertificate(store.getState().certificates.byStudent.s1.seenCertificateIds, 'mine'));
    // revoked on the server: the next fetch drops it from the overview
    await fetchCertificates(makeEnv(store, async () => okResponse(issuedRaw('old'))));
    assert.deepEqual(issuedIds(store.getState().certificates.byStudent.s1.overview), ['old']);
  });

  await check('c: a failed fetch keeps the cache and marks nothing', async () => {
    resetCertificatesFlowForTest();
    const store = realStore();
    await fetchCertificates(makeEnv(store, async () => okResponse(issuedRaw('old'))));
    for (const fetchOverview of [
      async () => { throw Object.assign(new Error('x'), { status: 500 }); },
      async () => ({ ok: false, status: 0, data: null }),
      async () => ({ ok: true, status: 200, data: { data: null as never, error: false } }),
    ]) {
      assert.equal(await fetchCertificates(makeEnv(store, fetchOverview as never)), 'failed');
    }
    assert.deepEqual(issuedIds(store.getState().certificates.byStudent.s1.overview), ['old']);
  });

  // ------------------------------------------------------------- (d) buttons
  await check('d: offline, no link and online-with-link', () => {
    const URL_ = 'https://learn.example.org/v/7F3K-92QD';
    const offline = certificateActions({ isOffline: true, checkUrl: URL_ });
    assert.deepEqual(offline, { enabled: false, note: 'offline', pdfUrl: null, shareUrl: null });
    assert.equal(en.certificates.noteOffline, 'Connect to the internet to save or share');
    for (const none of [null, undefined, '', '   ', 'ftp://x/y', 'javascript:alert(1)', 'not a url']) {
      const a = certificateActions({ isOffline: false, checkUrl: none });
      assert.deepEqual(a, { enabled: false, note: 'noLink', pdfUrl: null, shareUrl: null }, String(none));
    }
    assert.equal(en.certificates.noteNoLink, "Your organisation hasn't set up certificate links yet");
    const online = certificateActions({ isOffline: false, checkUrl: URL_ });
    assert.equal(online.enabled, true);
    assert.equal(online.note, null);
    assert.equal(online.pdfUrl, `${URL_}/certificate`);
    assert.equal(online.shareUrl, URL_);
    assert.equal(certificateActions({ isOffline: false, checkUrl: `${URL_}/` }).pdfUrl, `${URL_}/certificate`, 'a trailing slash is not doubled');
  });

  await check('d: no link beats offline (the permanent reason is said)', () => {
    assert.equal(certificateActions({ isOffline: true, checkUrl: null }).note, 'noLink');
  });

  // ------------------------------------------------------------- (e) hidden
  await check('e: the section is hidden when empty or unsupported', async () => {
    const empty = normaliseCertificatesOverview('s1', { curricula: [] }, NOW);
    assert.equal(buildCertificatesView(empty).hideSection, true);
    assert.equal(sectionVisible(empty, false), false, 'empty overview');
    assert.equal(sectionVisible(normaliseCertificatesOverview('s1', RAW, NOW), true), false, 'unsupported wins over a cached overview');
    assert.equal(sectionVisible(normaliseCertificatesOverview('s1', RAW, NOW), false), true);
    assert.equal(sectionVisible(undefined, false), true, 'loading or load error: the section speaks for itself');
    assert.equal(sectionVisible(undefined, true), false);
  });

  await check('e: a 404 means unsupported: stored nothing, and not asked again this session', async () => {
    resetCertificatesFlowForTest();
    const store = realStore();
    let calls = 0;
    const thrown = async () => { calls += 1; throw Object.assign(new Error('Not Found'), { status: 404 }); };
    assert.equal(await fetchCertificates(makeEnv(store, thrown as never)), 'unsupported');
    assert.equal(await fetchCertificates(makeEnv(store, thrown as never)), 'unsupported');
    assert.equal(calls, 1, 'no retry loop');
    assert.equal(store.getState().certificates.byStudent.s1, undefined);
    resetCertificatesFlowForTest();
    assert.equal(await fetchCertificates(makeEnv(store, async () => ({ ok: false, status: 404, data: null }))), 'unsupported');
  });

  await check('e: a view groups by programme, counts earned, and names a lone programme card once', () => {
    const v = buildCertificatesView(normaliseCertificatesOverview('s1', RAW, NOW));
    assert.equal(v.earnedCount, 2);
    assert.equal(v.groups.length, 1);
    assert.equal(v.groups[0].showHeading, true);
    const lone = buildCertificatesView(normaliseCertificatesOverview('s1', { curricula: [{ curriculumid: 'c', curriculumname: 'C', items: [{ scope: 'curriculum', scopeid: 'c', name: 'C', status: 'ready' }] }] }, NOW));
    assert.equal(lone.groups[0].showHeading, false);
    assert.equal(lone.earnedCount, 0);
  });

  // ------------------------------------------------------------- slice and wiring
  await check('slice: in the root reducer, persisted, per student, cleared on logout', () => {
    assert.ok(certificatesSlice.name in combinedReducers(undefined, { type: '@@init' } as never));
    assert.ok(persistWhitelist.includes(certificatesSlice.name));
    const o = normaliseCertificatesOverview('s1', RAW, NOW);
    let s = certificatesSlice.reducer(undefined, CertificatesActions.setCertificatesOverview({ overview: o, seenCertificateIds: ['cert-1'] }));
    s = certificatesSlice.reducer(s, CertificatesActions.setCertificatesOverview({ overview: { ...o, studentId: 's2' }, seenCertificateIds: [] }));
    assert.deepEqual(Object.keys(s.byStudent).sort(), ['s1', 's2']);
    assert.deepEqual(s.byStudent.s1.seenCertificateIds, ['cert-1']);
    assert.deepEqual(certificatesSlice.reducer(s, clearAllData()).byStudent, {});
  });

  await check('the certificate detail keeps My progress lit', () => {
    assert.equal(activeNavRouteName('progress/certificate'), 'progress/index');
  });

  console.log(`\n${passed} checks passed`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
