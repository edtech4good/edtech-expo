/**
 * Awards in My progress: the overview rules (grouping, sorting, filtering,
 * counts, numbering), the earned-date wording, which award a result earned and
 * the seen/new rule, the save path (a result is saved before, and never held up
 * or failed by, the awards check), response ordering, the 404 case, the
 * non-persisted sheet queue, and the persisted slice.
 *
 * Plain script run by `tsx` (package.json `test:awards`). Imports only pure
 * modules and redux slices (no react-native). Exits non-zero on the first
 * failed check.
 */
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import type { RawAwardsOverview } from '@/models';
import { awardsSlice, AwardsActions } from '../../../../redux/slices/AwardsSlice';
import {
  AwardSheetActions,
  awardSheetSlice,
  liveAwardSheetIds,
} from '../../../../redux/slices/AwardSheetSlice';
import { clearAllData } from '../../../../redux/CommonAction';
import { persistWhitelist } from '../../../../redux/persistWhitelist';
import { combinedReducers } from '../../../../redux/CombinedReducers';
import { stampContentLanguage } from '../../../../transforms/ContentLanguage';
import { activeNavRouteName } from '../../../../constants/NavItems';
import {
  RESULT_FRESH_MS,
  checkAwardsAfterResult,
  fetchAwards,
  noteSyncedResult,
  resetAwardsFlowForTest,
  saveResultThenAwards,
  type AwardsFetchEnv,
} from '../../../../services/awardsFlow';
import {
  allAwardIds,
  awardColorIndex,
  certificateOnLevel,
  awardsEarnedByResult,
  buildAwardsView,
  displayPercent,
  decideSeen,
  earnedDateWording,
  findAward,
  isNewAward,
  localiseAwardsOverview,
  normaliseAwardsOverview,
} from '../awardsLogic';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const lvl = (
  id: string,
  order: number,
  progress: number,
  awardable: boolean,
  award: null | { id: string; at: string; approx?: boolean } = null,
) => ({
  levelid: id,
  levelname: `Module ${order}`,
  levelorder: order,
  progress,
  awardable,
  award: award
    ? {
        studentawardid: award.id,
        earnedat: award.at,
        earnedat_approximate: !!award.approx,
      }
    : null,
});

const RAW: RawAwardsOverview = {
  curricula: [
    {
      curid: 'c1',
      curriculumname: 'Sustainable Design',
      grades: [
        {
          gradeid: 'g1',
          gradename: 'G',
          levels: [
            lvl('l1', 1, 100, true, { id: 'a1', at: '2026-09-12T12:00:00Z', approx: true }),
            lvl('l2', 2, 90, true, { id: 'a2', at: '2026-10-03T12:00:00Z' }),
            lvl('l3', 3, 62.5, true),
            lvl('l4', 4, 0, true),
            lvl('l5', 5, 10, false), // hidden tier: not shown
          ],
        },
      ],
    },
    {
      curid: 'c2',
      curriculumname: 'Workplace Skills',
      grades: [
        {
          gradeid: 'g2',
          levels: [
            lvl('m1', 1, 100, false, { id: 'a3', at: '2026-09-28T12:00:00Z' }), // kept though not awardable
            lvl('m2', 2, 0, false),
          ],
        },
      ],
    },
    {
      curid: 'c3',
      curriculumname: 'Nothing Awardable',
      grades: [{ gradeid: 'g3', levels: [lvl('n1', 1, 5, false)] }],
    },
  ],
  earnedelsewhere: [
    // The real server sends curid: matched to the live programme by id.
    {
      studentawardid: 'a4',
      levelid: 'old1',
      levelname: 'Old module',
      curid: 'c1',
      curriculumname: 'Sustainable Design',
      earnedat: '2026-10-20T12:00:00Z',
    },
    // No live programme has this id or name: a group of its own, last.
    {
      studentawardid: 'a5',
      levelid: 'old2',
      levelname: 'Retired',
      curid: 'cX',
      curriculumname: 'Retired Programme',
      earnedat: '2026-08-01T12:00:00Z',
    },
    // Name fallback (no curid): joins the live programme with that name.
    {
      studentawardid: 'a6',
      levelid: 'old3',
      levelname: 'Older module',
      curriculumname: 'Workplace Skills',
      earnedat: '2026-07-01T12:00:00Z',
    },
  ],
};
const OV = normaliseAwardsOverview('s1', RAW, 1000);

check('awardable:false with no award is hidden, with an award is kept', () => {
  const v = buildAwardsView(OV);
  const ids = v.groups.flatMap(g => g.items.map(i => (i.kind === 'earned' ? i.awardId : i.levelId)));
  assert.ok(!ids.includes('l5'));
  assert.ok(!ids.includes('m2'));
  assert.ok(ids.includes('a3'));
});

check('a programme with nothing to show is dropped', () => {
  assert.ok(!buildAwardsView(OV).groups.some(g => g.name === 'Nothing Awardable'));
});

check('earned newest first, then unearned in the server order', () => {
  const g = buildAwardsView(OV).groups[0];
  assert.equal(g.name, 'Sustainable Design');
  const order = g.items.map(i => (i.kind === 'earned' ? i.awardId : i.levelId));
  // a4 (20 Oct, earned elsewhere) > a2 (3 Oct) > a1 (12 Sep), then l3, l4
  assert.deepEqual(order, ['a4', 'a2', 'a1', 'l3', 'l4']);
});

check('earned-elsewhere joins the live group by curid, then by name; else its own group last', () => {
  const v = buildAwardsView(OV);
  assert.deepEqual(v.groups.map(g => g.name), [
    'Sustainable Design',
    'Workplace Skills',
    'Retired Programme',
  ]);
  const a4 = v.groups[0].items.find(i => i.kind === 'earned' && i.awardId === 'a4');
  assert.ok(a4 && a4.kind === 'earned' && a4.elsewhere, 'a4 joined by curid');
  const a6 = v.groups[1].items.find(i => i.kind === 'earned' && i.awardId === 'a6');
  assert.ok(a6 && a6.kind === 'earned' && a6.elsewhere, 'a6 joined by name (no curid)');
  // curid wins over a name that does not match any live programme
  const byId = buildAwardsView(normaliseAwardsOverview('s', {
    curricula: [{ curid: 'c1', curriculumname: 'Live', grades: [{ gradeid: 'g', levels: [lvl('l1', 1, 0, true)] }] }],
    earnedelsewhere: [{ studentawardid: 'z', curid: 'c1', curriculumname: 'Renamed Elsewhere', levelname: 'Z', earnedat: '2026-01-01T00:00:00Z' }],
  }));
  assert.equal(byId.groups.length, 1);
  assert.equal(byId.groups[0].earnedCount, 1);
});

check('counts: earned total, still to earn, per-group x of y', () => {
  const v = buildAwardsView(OV);
  assert.equal(v.earnedTotal, 6);
  assert.equal(v.toEarnTotal, 2);
  assert.equal(v.groups[0].earnedCount, 3);
  assert.equal(v.groups[0].totalCount, 5);
  assert.equal(v.groups[1].earnedCount, 2);
  assert.equal(v.groups[1].totalCount, 2);
});

check('empty and undefined overviews give no groups', () => {
  assert.deepEqual(buildAwardsView(undefined).groups, []);
  assert.equal(buildAwardsView(normaliseAwardsOverview('s', {})).earnedTotal, 0);
});

check('normalise: string progress, missing fields, clamping', () => {
  const o = normaliseAwardsOverview('s', {
    curricula: [{ curid: 'c', curriculumname: 'C', grades: [{ gradeid: 'g', levels: [
      { levelid: 'x', levelname: 'X', progress: '55.5' as any },
      { levelid: 'y', levelname: 'Y', progress: 140 },
    ] }] }],
  });
  assert.equal(o.curricula[0].levels[0].progress, 55.5);
  assert.equal(o.curricula[0].levels[0].awardable, true);
  assert.equal(o.curricula[0].levels[1].progress, 100);
});

check('displayPercent clamps to 0-100 and rounds like the app', () => {
  assert.equal(displayPercent(250), 100);
  assert.equal(displayPercent(-5), 0);
  assert.equal(displayPercent('abc'), 0);
  assert.equal(displayPercent(NaN), 0);
  assert.equal(displayPercent(62.5), 63);
  assert.equal(displayPercent(99.7), 99); // short of 100 never reads 100
  assert.equal(displayPercent(0.2), 1); // above 0 never reads 0
  assert.equal(displayPercent(100), 100);
  const o = normaliseAwardsOverview('s', { curricula: [{ curid: 'c', curriculumname: 'C', grades: [{ gradeid: 'g', levels: [
    { levelid: 'x', levelname: 'X', progress: 400 }, { levelid: 'y', levelname: 'Y', progress: -3 },
  ] }] }] });
  assert.equal(o.curricula[0].levels[0].progress, 100);
  assert.equal(o.curricula[0].levels[1].progress, 0);
});

check('findAward finds live and earned-elsewhere awards', () => {
  assert.equal(findAward(OV, 'a2')?.levelName, 'Module 2');
  assert.equal(findAward(OV, 'a2')?.number, 2);
  assert.equal(findAward(OV, 'a5')?.curriculumName, 'Retired Programme');
  assert.equal(findAward(OV, 'nope'), undefined);
});

// ------------------------------------------------------------ translations
check('names follow the interface language, base text when no translation', () => {
  const raw: RawAwardsOverview = {
    curricula: [{
      curid: 'c', curriculumname: 'Design', contentlanguage: 'en',
      translations: { km: { curriculumname: 'KM Design' } },
      grades: [{ gradeid: 'g', gradename: 'Grade', translations: { km: { gradename: 'KM Grade' } }, levels: [
        { ...lvl('l1', 1, 100, true, { id: 'a1', at: '2026-09-12T12:00:00Z' }), contentlanguage: 'en', translations: { km: { levelname: 'KM L1' } } },
        { ...lvl('l2', 2, 0, true), contentlanguage: 'en', translations: { km: { levelname: '   ' } } },
      ] }],
    }],
    earnedelsewhere: [{
      studentawardid: 'a9', levelname: 'Old', gradename: 'G', curriculumname: 'Gone',
      contentlanguage: 'en', translations: { km: { levelname: 'KM Old', curriculumname: 'KM Gone' } },
    }],
  };
  const o = normaliseAwardsOverview('s', raw);
  const km = localiseAwardsOverview(o, 'km')!;
  assert.equal(km.curricula[0].name, 'KM Design');
  assert.equal(km.curricula[0].levels[0].levelName, 'KM L1');
  assert.equal(km.curricula[0].levels[0].gradeName, 'KM Grade');
  assert.equal(km.curricula[0].levels[1].levelName, 'Module 2'); // blank translation never blanks
  assert.equal(km.earnedElsewhere[0].curriculumName, 'KM Gone');
  const en = localiseAwardsOverview(o, 'en')!;
  assert.equal(en.curricula[0].name, 'Design');
  assert.equal(o.curricula[0].name, 'Design'); // stored overview stays raw
});

// ---------------------------------------------------------------- dates
check('exact date reads "Earned <date>" (key earned), en-GB day month year', () => {
  const w = earnedDateWording('2026-10-03T12:00:00Z', false, 'en');
  assert.equal(w.key, 'earned');
  assert.equal(w.date, '3 Oct 2026');
});

check('approximate date uses the "by" wording', () => {
  const w = earnedDateWording('2026-09-12T12:00:00Z', true, 'en');
  assert.equal(w.key, 'earnedBy');
  assert.equal(w.date, '12 Sep 2026');
});

check('missing or bad date falls back to plain "Earned"', () => {
  assert.equal(earnedDateWording(null, false, 'en').key, 'earnedNoDate');
  assert.equal(earnedDateWording('garbage', true, 'en').key, 'earnedNoDate');
});


// ------------------------------------------- numbering, percent, colour, language
check('badge number and "n of total" count only the levels the section shows', () => {
  const raw: RawAwardsOverview = {
    curricula: [{
      curid: 'c', curriculumname: 'C',
      grades: [{ gradeid: 'g', levels: [
        lvl('h1', 1, 5, false), // hidden single-item tier, not earned: no number
        lvl('l2', 2, 100, true, { id: 'x2', at: '2026-10-03T12:00:00Z' }),
        lvl('h3', 3, 0, false),
        lvl('l4', 4, 50, true),
        lvl('l5', 5, 100, false, { id: 'x5', at: '2026-10-04T12:00:00Z' }), // kept though no longer awardable
      ] }],
    }],
  };
  const o = normaliseAwardsOverview('s', raw);
  const g = buildAwardsView(o).groups[0];
  const numbers = Object.fromEntries(
    g.items.map(i => [i.kind === 'earned' ? i.awardId : i.levelId, i.number]),
  );
  assert.deepEqual(numbers, { x5: 3, x2: 1, l4: 2 });
  const found = findAward(o, 'x2')!;
  assert.equal(found.number, 1);
  assert.equal(found.totalInProgramme, 3);
  assert.equal(findAward(o, 'x5')!.number, 3, 'list, sheet and detail agree');
});

check('the sheet percent is displayPercent of the level progress (as the list rounds)', () => {
  const o = normaliseAwardsOverview('s', { curricula: [{ curid: 'c', curriculumname: 'C', grades: [{ gradeid: 'g', levels: [
    lvl('l1', 1, 99.7, true, { id: 'x', at: '2026-10-03T12:00:00Z' }),
    lvl('l2', 2, 99.7, true),
  ] }] }] });
  // AwardEarnedSheet: displayPercent(found.progress); the list: displayPercent(item.progress)
  const shown = displayPercent(findAward(o, 'x')!.progress);
  const listed = buildAwardsView(o).groups[0].items.find(i => i.kind === 'unearned');
  assert.equal(shown, 99, 'short of 100 never reads 100');
  assert.equal(listed && listed.kind === 'unearned' ? displayPercent(listed.progress) : -1, shown);
});

check('badge colour slot follows the programme group everywhere (by curriculum id)', () => {
  const v = buildAwardsView(OV);
  const slot = (awardId: string) =>
    v.groups.find(g => g.items.some(i => i.kind === 'earned' && i.awardId === awardId))!.index;
  for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']) {
    assert.equal(awardColorIndex(OV, id), slot(id), id);
  }
  // an award earned elsewhere under a live programme takes that programme's colour
  assert.equal(awardColorIndex(OV, 'a4'), awardColorIndex(OV, 'a1'));
  // by id, not name: two programmes sharing a name keep their own colour
  const twins = normaliseAwardsOverview('s', { curricula: [
    { curid: 'c1', curriculumname: 'Same', grades: [{ gradeid: 'g', levels: [lvl('l1', 1, 100, true, { id: 'p', at: '2026-10-03T12:00:00Z' })] }] },
    { curid: 'c2', curriculumname: 'Same', grades: [{ gradeid: 'g2', levels: [lvl('m1', 1, 100, true, { id: 'q', at: '2026-10-03T12:00:00Z' })] }] },
  ] });
  assert.notEqual(awardColorIndex(twins, 'p'), awardColorIndex(twins, 'q'));
  assert.equal(findAward(twins, 'q')!.curriculumId, 'c2');
});

check('a translated envelope through stampContentLanguage gives the Khmer name its language', () => {
  // An opaque run of code points of the Khmer block (not words), as in the tierChip test.
  const KM = String.fromCodePoint(...Array.from({ length: 12 }, (_, i) => 0x1780 + i));
  const body: any = {
    contentlanguage: 'en',
    error: false,
    data: {
      curricula: [{
        curid: 'c', curriculumname: 'Design',
        translations: { km: { curriculumname: KM } },
        grades: [{ gradeid: 'g', gradename: 'Grade', translations: { km: { gradename: KM } }, levels: [
          { ...lvl('l1', 1, 100, true, { id: 'a1', at: '2026-09-12T12:00:00Z' }), translations: { km: { levelname: KM } } },
          { ...lvl('l2', 2, 0, true), translations: {} },
        ] }],
      }],
      earnedelsewhere: [{ studentawardid: 'e', levelname: 'Old', curriculumname: 'Gone', translations: { km: { curriculumname: KM } } }],
    },
  };
  stampContentLanguage(body); // what the API layer does with every response
  const o = normaliseAwardsOverview('s', body.data);
  assert.equal(o.curricula[0].levels[0].contentLanguage, 'en');
  assert.equal(o.curricula[0].levels[0].gradeContentLanguage, 'en');
  const km = localiseAwardsOverview(o, 'km')!;
  assert.equal(km.curricula[0].name, KM);
  assert.equal(km.curricula[0].nameLanguage, 'km');
  assert.equal(km.curricula[0].levels[0].levelName, KM);
  assert.equal(km.curricula[0].levels[0].levelNameLanguage, 'km');
  assert.equal(km.curricula[0].levels[0].gradeNameLanguage, 'km');
  // no translation: base text, in the base text's own language
  assert.equal(km.curricula[0].levels[1].levelName, 'Module 2');
  assert.equal(km.curricula[0].levels[1].levelNameLanguage, 'en');
  assert.equal(km.earnedElsewhere[0].curriculumNameLanguage, 'km');
  assert.equal(km.earnedElsewhere[0].levelNameLanguage, 'en');
  const en = localiseAwardsOverview(o, 'en')!;
  assert.equal(en.curricula[0].levels[0].levelNameLanguage, 'en');
  // the language travels to the detail and the sheet through findAward
  assert.equal(findAward(km, 'a1')!.levelNameLanguage, 'km');
  assert.equal(findAward(km, 'a1')!.curriculumNameLanguage, 'km');
});

// ------------------------------------------------ which award a result earned
// The app sends `starttime` (epoch ms, from createTimeStamp) with the result;
// the server stores the award's earnedat from exactly that value
// (result.controller -> updateUserReward/updateLevelQuizReward(currentdate) ->
// awardLevelIfCompleted). The column keeps whole seconds, so compare instants.
const START = Date.parse('2026-11-11T09:30:15.400Z'); // a ms-bearing start time
const award = (id: string, at: string, approx = false) => ({ id, at, approx });
const rawWith = (...awards: { id: string; at: string; approx: boolean }[]): RawAwardsOverview => ({
  curricula: [{ curid: 'c1', curriculumname: 'Programme', grades: [{ gradeid: 'g1', levels: [
    ...awards.map((a, i) => lvl(`L${i}${a.id}`, i + 1, 100, true, a)),
    lvl('Ltodo', 99, 20, true),
  ] }] }],
});

check('rule 2: exact match within 2 s matches (whole-second earnedat vs a ms start time)', () => {
  const o = normaliseAwardsOverview('s1', rawWith(award('hit', '2026-11-11T09:30:15Z')));
  assert.deepEqual(awardsEarnedByResult(o, START), ['hit']);
  // within the window on either side, and at the 2 s edge
  assert.deepEqual(awardsEarnedByResult(o, Date.parse('2026-11-11T09:30:16.900Z')), ['hit']);
  assert.deepEqual(awardsEarnedByResult(o, Date.parse('2026-11-11T09:30:13.000Z')), ['hit']);
});

check('rule 2: the same instant written in another zone offset still matches (instants, not strings)', () => {
  const o = normaliseAwardsOverview('s1', rawWith(award('tz', '2026-11-11T16:30:15+07:00')));
  assert.deepEqual(awardsEarnedByResult(o, START), ['tz']);
});

check('rule 2: an approximate award never matches', () => {
  const o = normaliseAwardsOverview('s1', rawWith(award('apx', '2026-11-11T09:30:15Z', true)));
  assert.deepEqual(awardsEarnedByResult(o, START), []);
});

check('rule 2: an earnedat 10 s away does not match', () => {
  const o = normaliseAwardsOverview('s1', rawWith(award('far', '2026-11-11T09:30:25Z'), award('past', '2026-11-11T09:30:05Z')));
  assert.deepEqual(awardsEarnedByResult(o, START), []);
});

check('rule 2: a missing/garbled earnedat or start time matches nothing', () => {
  const o = normaliseAwardsOverview('s1', rawWith(award('bad', 'garbage')));
  assert.deepEqual(awardsEarnedByResult(o, START), []);
  const ok = normaliseAwardsOverview('s1', rawWith(award('hit', '2026-11-11T09:30:15Z')));
  assert.deepEqual(awardsEarnedByResult(ok, NaN), []);
});

check('rule 2 also finds an earned-elsewhere award (same row shape)', () => {
  const o = normaliseAwardsOverview('s1', {
    curricula: [],
    earnedelsewhere: [{ studentawardid: 'el', curid: 'cX', curriculumname: 'Old', levelname: 'M', earnedat: '2026-11-11T09:30:15Z' }],
  });
  assert.deepEqual(awardsEarnedByResult(o, START), ['el']);
});

// ------------------------------------------------------------ seen / new
const ids = allAwardIds(OV);
check('allAwardIds covers live and earned-elsewhere', () => {
  assert.deepEqual([...ids].sort(), ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);
});

check('first fetch with no matching result marks everything seen, no sheet, no New chip', () => {
  const d = decideSeen({ prevSeen: null, awardIds: ids, matchedIds: [] });
  assert.deepEqual([...d.seenAwardIds].sort(), ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);
  assert.deepEqual(d.sheetAwardIds, []);
  assert.ok(ids.every(id => !isNewAward(d.seenAwardIds, id)));
});

check('first-ever fetch with a matching award: sheet for it, every other award seen', () => {
  const d = decideSeen({ prevSeen: null, awardIds: [...ids, 'mine'], matchedIds: ['mine'] });
  assert.deepEqual(d.sheetAwardIds, ['mine']);
  assert.ok(!d.seenAwardIds.includes('mine'));
  assert.ok(ids.every(id => d.seenAwardIds.includes(id)));
  assert.ok(isNewAward(d.seenAwardIds, 'mine'));
});

check('later fetch: only a matched, unseen award queues; any other unseen award gets the chip only', () => {
  const seen = ['a1', 'a2'];
  const d = decideSeen({ prevSeen: seen, awardIds: ['a1', 'a2', 'a3', 'mine'], matchedIds: ['mine'] });
  assert.deepEqual(d.sheetAwardIds, ['mine']);
  assert.ok(isNewAward(d.seenAwardIds, 'a3'), 'a3 is New');
  assert.ok(!d.sheetAwardIds.includes('a3'), 'a3 never gets a sheet');
});

check('a matched award that is already seen queues nothing (rule c)', () => {
  const d = decideSeen({ prevSeen: ['mine'], awardIds: ['mine'], matchedIds: ['mine'] });
  assert.deepEqual(d.sheetAwardIds, []);
});

check('a matched id the overview does not hold is ignored', () => {
  const d = decideSeen({ prevSeen: null, awardIds: ['a1'], matchedIds: ['ghost'] });
  assert.deepEqual(d.sheetAwardIds, []);
});

// ------------------------------------------------ the store, fetch and queue
const realStore = () =>
  configureStore({
    reducer: combinedReducers,
    middleware: gdm => gdm({ serializableCheck: false, immutableCheck: false }),
  });
type TestStore = ReturnType<typeof realStore>;
const okResponse = (raw: RawAwardsOverview) => ({
  ok: true, status: 200, data: { data: raw, error: false },
});
const makeEnv = (
  store: TestStore,
  fetchOverview: AwardsFetchEnv['fetchOverview'],
  now: { t: number } = { t: START + 5000 },
  student: { id: string | undefined } = { id: 's1' },
): AwardsFetchEnv => ({
  fetchOverview,
  studentId: () => student.id,
  seenAwardIds: id => store.getState().awards.byStudent[id]?.seenAwardIds ?? null,
  dispatch: a => store.dispatch(a as never),
  now: () => now.t,
});
const queued = (store: TestStore, student = 's1', now = START + 6000) =>
  liveAwardSheetIds(store.getState().awardSheet, student, now);
const BASE_RAW = rawWith(award('old1', '2026-09-01T10:00:00Z', true));
const WITH_NEW = (at: string, approx = false): RawAwardsOverview =>
  rawWith(award('old1', '2026-09-01T10:00:00Z', true), award('mine', at, approx));

(async () => {
  // --- rule 2 end to end
  {
    resetAwardsFlowForTest();
    const store = realStore();
    const now = { t: START + 5000 };
    // baseline fetch (first ever, no result): everything seen
    await fetchAwards(makeEnv(store, async () => okResponse(BASE_RAW), now));
    assert.deepEqual(store.getState().awards.byStudent.s1.seenAwardIds, ['old1']);
    assert.deepEqual(queued(store), []);
    // a synced result, then a refetch holding an award that matches its start time
    noteSyncedResult(START, now.t);
    const outcome = await fetchAwards(makeEnv(store, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z')), now));
    assert.equal(outcome, 'ok');
    assert.deepEqual(queued(store), ['mine']);
    assert.ok(isNewAward(store.getState().awards.byStudent.s1.seenAwardIds, 'mine'));
    // closing it marks it seen and leaves the queue; the next fetch does not bring it back
    store.dispatch(AwardsActions.markAwardsSeen({ studentId: 's1', ids: ['mine'] }));
    assert.deepEqual(queued(store), []);
    await fetchAwards(makeEnv(store, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z')), now));
    assert.deepEqual(queued(store), []);
    console.log('ok   rule 2 end to end: match queues the sheet once; closing marks it seen for good');
    passed += 1;
  }

  for (const [name, at, approx] of [
    ['an approximate award', '2026-11-11T09:30:15Z', true],
    ['an award 10 s from the result', '2026-11-11T09:30:25Z', false],
  ] as const) {
    resetAwardsFlowForTest();
    const store = realStore();
    const now = { t: START + 5000 };
    await fetchAwards(makeEnv(store, async () => okResponse(BASE_RAW), now));
    noteSyncedResult(START, now.t);
    await fetchAwards(makeEnv(store, async () => okResponse(WITH_NEW(at, approx)), now));
    assert.deepEqual(queued(store), [], `${name}: no sheet`);
    assert.ok(isNewAward(store.getState().awards.byStudent.s1.seenAwardIds, 'mine'), `${name}: New chip only`);
    console.log(`ok   ${name} gets the New chip but no sheet`);
    passed += 1;
  }

  {
    resetAwardsFlowForTest();
    const store = realStore();
    const now = { t: START + 5000 };
    // first-ever fetch (no baseline at all) after a result that earned an award
    noteSyncedResult(START, now.t);
    const raw = rawWith(award('old1', '2026-09-01T10:00:00Z', true), award('mine', '2026-11-11T09:30:15Z'));
    await fetchAwards(makeEnv(store, async () => okResponse(raw), now));
    assert.deepEqual(queued(store), ['mine']);
    assert.deepEqual(store.getState().awards.byStudent.s1.seenAwardIds, ['old1']);
    console.log('ok   first-ever fetch: the matching award gets its sheet, every other award is seen');
    passed += 1;
  }

  {
    // a plain refresh (no recent synced result) never queues, whatever the dates look like
    resetAwardsFlowForTest();
    const store = realStore();
    const now = { t: START + 5000 };
    await fetchAwards(makeEnv(store, async () => okResponse(BASE_RAW), now));
    await fetchAwards(makeEnv(store, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z')), now));
    assert.deepEqual(queued(store), []);
    // a result noted longer ago than RESULT_FRESH_MS no longer matches either
    resetAwardsFlowForTest();
    const store2 = realStore();
    await fetchAwards(makeEnv(store2, async () => okResponse(BASE_RAW), now));
    noteSyncedResult(START, now.t);
    now.t += RESULT_FRESH_MS + 1;
    await fetchAwards(makeEnv(store2, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z')), now));
    assert.deepEqual(queued(store2, 's1', now.t), []);
    console.log('ok   no recent synced result (or an old one): nothing queued, only the chip');
    passed += 1;
  }

  {
    // offline / unsynced: nothing is queued by the save path, and a failed fetch changes nothing
    resetAwardsFlowForTest();
    const store = realStore();
    const log: string[] = [];
    const env = makeEnv(store, async () => { log.push('fetch'); throw Object.assign(new Error('offline'), { status: undefined }); });
    await saveResultThenAwards({
      submit: async () => ({ synced: false }), // offline: left in the pending queue
      enabled: true,
      startMs: START,
      afterSynced: ms => checkAwardsAfterResult(env, ms),
    });
    await new Promise(r => setTimeout(r, 20));
    assert.deepEqual(log, [], 'an unsynced result does not even fetch');
    assert.deepEqual(queued(store), []);
    assert.equal(await fetchAwards(env), 'failed');
    assert.equal(store.getState().awards.byStudent.s1, undefined, 'a failed fetch leaves the cache alone');
    console.log('ok   offline/unsynced: nothing fetched, nothing queued');
    passed += 1;
  }

  {
    // checkAwardsAfterResult end to end (fire and forget) for a synced result
    resetAwardsFlowForTest();
    const store = realStore();
    const now = { t: START + 5000 };
    await fetchAwards(makeEnv(store, async () => okResponse(BASE_RAW), now));
    const env = makeEnv(store, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z')), now);
    checkAwardsAfterResult(env, START);
    await new Promise(r => setTimeout(r, 20));
    assert.deepEqual(queued(store), ['mine']);
    console.log('ok   checkAwardsAfterResult queues the sheet in the background');
    passed += 1;
  }

  // --- the save path
  {
    const log: string[] = [];
    const result = await saveResultThenAwards({
      submit: async () => { log.push('enqueue'); await Promise.resolve(); log.push('submitted'); return { synced: true, id: 7 }; },
      enabled: true,
      startMs: START,
      afterSynced: () => { log.push('awards'); },
    });
    assert.deepEqual(log, ['enqueue', 'submitted', 'awards'], 'the result is enqueued and submitted before any awards call');
    assert.deepEqual(result, { synced: true, id: 7 }, 'the save answer passes through untouched');
    console.log('ok   save path: enqueue, submit, then awards; answer untouched');
    passed += 1;
  }

  {
    const within = async <T,>(p: Promise<T>, ms = 300): Promise<T | 'TIMEOUT'> =>
      Promise.race([p, new Promise<'TIMEOUT'>(r => setTimeout(() => r('TIMEOUT'), ms))]);
    // a check that never settles cannot delay the save
    const hang = await within(saveResultThenAwards({
      submit: async () => ({ synced: true }),
      enabled: true,
      startMs: START,
      afterSynced: () => new Promise<void>(() => {}),
    }));
    assert.notEqual(hang, 'TIMEOUT', 'a hanging awards check must not delay saveResult');
    assert.deepEqual(hang, { synced: true });
    // one that throws synchronously, and one that rejects, cannot fail it
    const thrown = await within(saveResultThenAwards({
      submit: async () => ({ synced: true }), enabled: true, startMs: START,
      afterSynced: () => { throw new Error('boom'); },
    }));
    assert.deepEqual(thrown, { synced: true });
    const rejected = await within(saveResultThenAwards({
      submit: async () => ({ synced: true }), enabled: true, startMs: START,
      afterSynced: () => Promise.reject(new Error('nope')),
    }));
    assert.deepEqual(rejected, { synced: true });
    // the real fire-and-forget entry point with a fetch that hangs / throws
    resetAwardsFlowForTest();
    const store = realStore();
    const hangs = makeEnv(store, () => new Promise(() => {}));
    const throws = makeEnv(store, () => { throw new Error('sync throw'); });
    const t0 = Date.now();
    checkAwardsAfterResult(hangs, START);
    checkAwardsAfterResult(throws, START);
    assert.ok(Date.now() - t0 < 100, 'checkAwardsAfterResult returns at once');
    const viaReal = await within(saveResultThenAwards({
      submit: async () => ({ synced: true }), enabled: true, startMs: START,
      afterSynced: ms => checkAwardsAfterResult(hangs, ms),
    }));
    assert.deepEqual(viaReal, { synced: true });
    console.log('ok   save path: a hanging, throwing or rejecting awards check never delays or fails the save');
    passed += 1;
  }

  {
    // a failing save stays a failing save, and awards are not touched; kids design: not enabled
    let called = 0;
    await assert.rejects(
      saveResultThenAwards({
        submit: async () => { throw new Error('save failed'); },
        enabled: true, startMs: START, afterSynced: () => { called += 1; },
      }),
      /save failed/,
    );
    await saveResultThenAwards({ submit: async () => ({ synced: true }), enabled: false, startMs: START, afterSynced: () => { called += 1; } });
    await saveResultThenAwards({ submit: async () => ({ synced: true }), enabled: true, startMs: undefined, afterSynced: () => { called += 1; } });
    assert.equal(called, 0);
    console.log('ok   save path: failure propagates; non-corporate or no start time calls nothing');
    passed += 1;
  }

  // --- response ordering
  {
    resetAwardsFlowForTest();
    const store = realStore();
    let resolveA!: (r: ReturnType<typeof okResponse>) => void;
    const slowOld = new Promise<ReturnType<typeof okResponse>>(r => { resolveA = r; });
    const envA = makeEnv(store, () => slowOld);
    const envB = makeEnv(store, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z')));
    const a = fetchAwards(envA); // earlier request, slow
    const b = fetchAwards(envB); // later request, fast
    await b;
    assert.ok(findAward(store.getState().awards.byStudent.s1.overview, 'mine'), 'the newer response is stored');
    resolveA(okResponse(BASE_RAW)); // the older response arrives last, without the award
    await a;
    assert.ok(
      findAward(store.getState().awards.byStudent.s1.overview, 'mine'),
      'an earlier response never overwrites a newer one',
    );
    // in order, the later one still wins
    resetAwardsFlowForTest();
    const store2 = realStore();
    await fetchAwards(makeEnv(store2, async () => okResponse(BASE_RAW)));
    await fetchAwards(makeEnv(store2, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z'))));
    assert.ok(findAward(store2.getState().awards.byStudent.s1.overview, 'mine'));
    console.log('ok   ordering: a late response from an earlier request never overwrites a newer one');
    passed += 1;
  }

  {
    // the stale response may still raise the sheet the newer one could not
    resetAwardsFlowForTest();
    const store = realStore();
    const now = { t: START + 5000 };
    await fetchAwards(makeEnv(store, async () => okResponse(BASE_RAW), now));
    noteSyncedResult(START, now.t);
    let resolveB!: (r: ReturnType<typeof okResponse>) => void;
    const slowResult = new Promise<ReturnType<typeof okResponse>>(r => { resolveB = r; });
    const b = fetchAwards(makeEnv(store, () => slowResult, now)); // result-time request, slow
    await fetchAwards(makeEnv(store, async () => okResponse(WITH_NEW('2026-11-11T09:30:15Z')), now)); // a later refresh wins the race
    resolveB(okResponse(WITH_NEW('2026-11-11T09:30:15Z')));
    await b;
    assert.deepEqual(queued(store), ['mine'], 'one sheet, whichever response saw it first');
    console.log('ok   ordering: a result-time request overtaken by a refresh still yields exactly one sheet');
    passed += 1;
  }

  // --- 404 and other errors
  {
    resetAwardsFlowForTest();
    const store = realStore();
    const thrown404 = await fetchAwards(makeEnv(store, async () => { throw Object.assign(new Error('Request failed'), { status: 404 }); }));
    const resolved404 = await fetchAwards(makeEnv(store, async () => ({ ok: false, status: 404, data: null })));
    assert.equal(thrown404, 'unsupported');
    assert.equal(resolved404, 'unsupported');
    for (const status of [500, 503, undefined]) {
      const out = await fetchAwards(makeEnv(store, async () => { throw Object.assign(new Error('x'), { status }); }));
      assert.equal(out, 'failed', `status ${status} stays an error`);
    }
    assert.equal(await fetchAwards(makeEnv(store, async () => ({ ok: true, status: 200, data: { data: null as never, error: false } }))), 'failed');
    assert.equal(store.getState().awards.byStudent.s1, undefined, 'nothing stored by any of them');
    console.log('ok   404 is "unsupported" (section hides quietly); other errors stay errors');
    passed += 1;
  }

  {
    // the learner changing while a request is out stores nothing
    resetAwardsFlowForTest();
    const store = realStore();
    const student = { id: 's1' as string | undefined };
    const env = makeEnv(store, async () => { student.id = 's2'; return okResponse(BASE_RAW); }, { t: START }, student);
    assert.equal(await fetchAwards(env), 'failed');
    assert.equal(store.getState().awards.byStudent.s1, undefined);
    console.log('ok   a learner change mid-request stores nothing');
    passed += 1;
  }

  // --- the sheet queue is in memory only, per learner
  check('the sheet queue is not in the persist whitelist; the awards slice is, and holds no sheet', () => {
    assert.ok(persistWhitelist.includes(awardsSlice.name));
    assert.ok(!persistWhitelist.includes(awardSheetSlice.name));
    assert.ok(awardSheetSlice.name in combinedReducers(undefined, { type: '@@init' } as never));
    const s = awardsSlice.reducer(undefined, AwardsActions.setAwardsOverview({ overview: OV, seenAwardIds: ['a1'] }));
    assert.deepEqual(Object.keys(s.byStudent.s1).sort(), ['overview', 'seenAwardIds']);
  });

  check('the sheet queue clears on logout, on a learner change, and when an award is seen', () => {
    const entries = [{ awardId: 'x', expiresAt: START + 1000 }, { awardId: 'y', expiresAt: START + 1000 }];
    let q = awardSheetSlice.reducer(undefined, AwardSheetActions.queueAwardSheet({ studentId: 's1', entries }));
    assert.deepEqual(liveAwardSheetIds(q, 's1', START), ['x', 'y']);
    // the same entries twice: one each
    q = awardSheetSlice.reducer(q, AwardSheetActions.queueAwardSheet({ studentId: 's1', entries }));
    assert.deepEqual(liveAwardSheetIds(q, 's1', START), ['x', 'y']);
    // another learner never sees it, and queueing for them replaces it
    assert.deepEqual(liveAwardSheetIds(q, 's2', START), []);
    const other = awardSheetSlice.reducer(q, AwardSheetActions.queueAwardSheet({ studentId: 's2', entries: [{ awardId: 'z', expiresAt: START + 1000 }] }));
    assert.deepEqual(liveAwardSheetIds(other, 's2', START), ['z']);
    assert.deepEqual(liveAwardSheetIds(other, 's1', START), []);
    // seen elsewhere (detail opened) leaves the queue
    const seen = awardSheetSlice.reducer(q, AwardsActions.markAwardsSeen({ studentId: 's1', ids: ['x'] }));
    assert.deepEqual(liveAwardSheetIds(seen, 's1', START), ['y']);
    // logout
    assert.deepEqual(awardSheetSlice.reducer(q, clearAllData()), { studentId: null, queue: [] });
    assert.deepEqual(awardSheetSlice.reducer(q, AwardSheetActions.clearAwardSheet()), { studentId: null, queue: [] });
  });

  check('a queued sheet expires: never shown later, dropped', () => {
    const q = awardSheetSlice.reducer(undefined, AwardSheetActions.queueAwardSheet({
      studentId: 's1', entries: [{ awardId: 'x', expiresAt: START + 1000 }],
    }));
    assert.deepEqual(liveAwardSheetIds(q, 's1', START + 999), ['x']);
    assert.deepEqual(liveAwardSheetIds(q, 's1', START + 1000), []);
    const dropped = awardSheetSlice.reducer(q, AwardSheetActions.dropExpiredAwardSheet({ now: START + 1000 }));
    assert.deepEqual(dropped.queue, []);
  });

  check('My progress stays the active nav item while the award detail is open', () => {
    assert.equal(activeNavRouteName('progress/award'), 'progress/index');
    assert.equal(activeNavRouteName('progress/index'), 'progress/index');
    assert.equal(activeNavRouteName('home'), 'home');
    assert.equal(activeNavRouteName(undefined), undefined);
  });

  // ------------------------------------------------------------- the slice
  check('the awards slice is in the root reducer', () => {
    assert.ok(awardsSlice.name in combinedReducers(undefined, { type: '@@init' } as never));
  });

  check('slice: stored per student, survives a second student, clearAllData resets', () => {
    let s = awardsSlice.reducer(undefined, AwardsActions.setAwardsOverview({ overview: OV, seenAwardIds: ['a1'] }));
    s = awardsSlice.reducer(s, AwardsActions.setAwardsOverview({ overview: { ...OV, studentId: 's2' }, seenAwardIds: [] }));
    assert.deepEqual(Object.keys(s.byStudent).sort(), ['s1', 's2']);
    assert.deepEqual(s.byStudent.s1.seenAwardIds, ['a1']);
    assert.deepEqual(awardsSlice.reducer(s, clearAllData()).byStudent, {});
  });

  // Level screen certificate line: only a curriculum set to certificate for levels.
  const recOverview = (recognition: unknown) =>
    normaliseAwardsOverview('s1', {
      curricula: [
        {
          curid: 'c1',
          curriculumname: 'Course',
          recognition: recognition as never,
          grades: [{ gradeid: 'g1', levels: [lvl('lv1', 1, 0, true)] }],
        },
      ],
    });
  const rec = (level: unknown) => ({ level, grade: 'none', curriculum: 'none' });

  check('certificateOnLevel: level recognition certificate -> certificate wording', () => {
    const ov = recOverview(rec('certificate'));
    assert.equal(certificateOnLevel(ov, { levelId: 'lv1' }), true);
    assert.equal(certificateOnLevel(ov, { curriculumId: 'c1' }), true);
  });

  check('certificateOnLevel: award and none -> plain count', () => {
    assert.equal(certificateOnLevel(recOverview(rec('award')), { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(recOverview(rec('none')), { levelId: 'lv1' }), false);
    // grade/curriculum certificate does not promise a level certificate
    const other = recOverview({ level: 'none', grade: 'certificate', curriculum: 'certificate' });
    assert.equal(certificateOnLevel(other, { levelId: 'lv1' }), false);
  });

  check('certificateOnLevel: no overview, unknown level, absent or unknown recognition -> plain count', () => {
    const ov = recOverview(rec('certificate'));
    assert.equal(certificateOnLevel(undefined, { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(null, { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(ov, { levelId: 'nope' }), false);
    assert.equal(certificateOnLevel(ov, { curriculumId: 'nope' }), false);
    assert.equal(certificateOnLevel(ov, {}), false);
    assert.equal(certificateOnLevel(recOverview(undefined), { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(recOverview(null), { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(recOverview({}), { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(recOverview(rec('Certificate')), { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(recOverview(rec('gold')), { levelId: 'lv1' }), false);
    assert.equal(certificateOnLevel(recOverview(rec(7)), { levelId: 'lv1' }), false);
    // an overview cached before the field existed
    assert.equal(certificateOnLevel(OV, { levelId: 'lv1' }), false);
  });

  console.log(`\n${passed} checks passed`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
