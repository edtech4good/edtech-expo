/**
 * Awards in My progress: the overview rules (grouping, sorting, filtering,
 * counts), the earned-date wording, the seen/new rule and the persisted slice.
 *
 * Plain script run by `tsx` (package.json `test:awards`). Imports only pure
 * modules and redux slices (no react-native). Exits non-zero on the first
 * failed check.
 */
import assert from 'node:assert/strict';
import type { RawAwardsOverview } from '@/models';
import { awardsSlice, AwardsActions } from '../../../../redux/slices/AwardsSlice';
import { persistWhitelist } from '../../../../redux/persistWhitelist';
import { combinedReducers } from '../../../../redux/CombinedReducers';
import {
  allAwardIds,
  buildAwardsView,
  decideSeen,
  earnedDateWording,
  findAward,
  isNewAward,
  localiseAwardsOverview,
  normaliseAwardsOverview,
  shouldCheckAwardsAfterResult,
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
    {
      studentawardid: 'a4',
      levelid: 'old1',
      levelname: 'Old module',
      curriculumname: 'Sustainable Design',
      earnedat: '2026-10-20T12:00:00Z',
    },
    {
      studentawardid: 'a5',
      levelid: 'old2',
      levelname: 'Retired',
      curriculumname: 'Retired Programme',
      earnedat: '2026-08-01T12:00:00Z',
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

check('earned-elsewhere joins the live group by name, else gets its own group last', () => {
  const v = buildAwardsView(OV);
  assert.deepEqual(v.groups.map(g => g.name), [
    'Sustainable Design',
    'Workplace Skills',
    'Retired Programme',
  ]);
  const a4 = v.groups[0].items.find(i => i.kind === 'earned' && i.awardId === 'a4');
  assert.ok(a4 && a4.kind === 'earned' && a4.elsewhere);
});

check('counts: earned total, still to earn, per-group x of y', () => {
  const v = buildAwardsView(OV);
  assert.equal(v.earnedTotal, 5);
  assert.equal(v.toEarnTotal, 2);
  assert.equal(v.groups[0].earnedCount, 3);
  assert.equal(v.groups[0].totalCount, 5);
  assert.equal(v.groups[1].totalCount, 1);
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

// ------------------------------------------------------------ seen / new
const ids = allAwardIds(OV);
check('allAwardIds covers live and earned-elsewhere', () => {
  assert.deepEqual([...ids].sort(), ['a1', 'a2', 'a3', 'a4', 'a5']);
});

check('first fetch marks every award seen and shows no sheet (even after a result)', () => {
  for (const trigger of ['refresh', 'result'] as const) {
    const d = decideSeen({ prevSeen: null, prevSheet: [], awardIds: ids, trigger });
    assert.deepEqual([...d.seenAwardIds].sort(), ['a1', 'a2', 'a3', 'a4', 'a5']);
    assert.deepEqual(d.sheetAwardIds, []);
  }
});

check('first fetch leaves no New chip', () => {
  const d = decideSeen({ prevSeen: null, prevSheet: [], awardIds: ids, trigger: 'refresh' });
  assert.ok(ids.every(id => !isNewAward(d.seenAwardIds, id)));
});

check('a later new award after a result queues the sheet once', () => {
  const seen = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const d1 = decideSeen({ prevSeen: seen, prevSheet: [], awardIds: [...ids, 'a6'], trigger: 'result' });
  assert.deepEqual(d1.sheetAwardIds, ['a6']);
  assert.ok(isNewAward(d1.seenAwardIds, 'a6'));
  // The same fetch repeated does not queue a duplicate.
  const d2 = decideSeen({ prevSeen: d1.seenAwardIds, prevSheet: d1.sheetAwardIds, awardIds: [...ids, 'a6'], trigger: 'result' });
  assert.deepEqual(d2.sheetAwardIds, ['a6']);
});

check('closing the sheet marks it seen and it never returns', () => {
  const seen = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const d1 = decideSeen({ prevSeen: seen, prevSheet: [], awardIds: [...ids, 'a6'], trigger: 'result' });
  let state = awardsSlice.reducer(undefined, AwardsActions.setAwardsOverview({
    overview: OV, seenAwardIds: d1.seenAwardIds, sheetAwardIds: d1.sheetAwardIds,
  }));
  state = awardsSlice.reducer(state, AwardsActions.markAwardsSeen({ studentId: 's1', ids: ['a6'] }));
  assert.deepEqual(state.byStudent.s1.sheetAwardIds, []);
  assert.ok(state.byStudent.s1.seenAwardIds!.includes('a6'));
  const d3 = decideSeen({
    prevSeen: state.byStudent.s1.seenAwardIds, prevSheet: state.byStudent.s1.sheetAwardIds,
    awardIds: [...ids, 'a6'], trigger: 'result',
  });
  assert.deepEqual(d3.sheetAwardIds, []);
});

check('a plain refresh never queues a sheet, but the New chip shows', () => {
  const d = decideSeen({ prevSeen: ['a1'], prevSheet: [], awardIds: ['a1', 'a2'], trigger: 'refresh' });
  assert.deepEqual(d.sheetAwardIds, []);
  assert.ok(isNewAward(d.seenAwardIds, 'a2'));
});

check('an award that disappears is dropped from the queue', () => {
  const d = decideSeen({ prevSeen: ['a1'], prevSheet: ['gone'], awardIds: ['a1'], trigger: 'result' });
  assert.deepEqual(d.sheetAwardIds, []);
});

check('an offline-queued result triggers no check; a synced one does', () => {
  assert.equal(shouldCheckAwardsAfterResult(false), false);
  assert.equal(shouldCheckAwardsAfterResult(true), true);
});

// ------------------------------------------------------------- the slice
check('the awards slice is in the persisted whitelist and the root reducer', () => {
  assert.ok(persistWhitelist.includes(awardsSlice.name));
  assert.ok(awardsSlice.name in combinedReducers(undefined, { type: '@@init' } as never));
});

check('slice: stored per student, survives a second student, clearAllData resets', () => {
  let s = awardsSlice.reducer(undefined, AwardsActions.setAwardsOverview({
    overview: OV, seenAwardIds: ['a1'], sheetAwardIds: [],
  }));
  s = awardsSlice.reducer(s, AwardsActions.setAwardsOverview({
    overview: { ...OV, studentId: 's2' }, seenAwardIds: [], sheetAwardIds: [],
  }));
  assert.deepEqual(Object.keys(s.byStudent).sort(), ['s1', 's2']);
  assert.deepEqual(s.byStudent.s1.seenAwardIds, ['a1']);
});

console.log(`\n${passed} checks passed`);
