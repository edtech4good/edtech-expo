/**
 * Learning-item types (design note "Learning items" §4, §8, §10): which
 * renderer an item gets, what a missing type means, and that an item this
 * build cannot render is never the lesson's "next step". Also that the lesson
 * cache carries the new fields and an old cached payload (no type) still
 * resolves to video.
 *
 * Plain script run by `tsx` (package.json `test:learningitems`). Exits
 * non-zero on the first failed check.
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_LEARNING_ITEM_TYPE,
  SUPPORTED_LEARNING_ITEM_TYPES,
  isLearningItemSupported,
  learningItemRenderer,
  resolveLearningItemType,
} from '../LearningItems';
import { pickNextStep } from '../../screens/LessonSelection/nextStep';
import {
  lessonCacheSlice,
  LessonCacheActions,
} from '../../redux/slices/LessonCacheSlice';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

check('video renders as video', () => {
  assert.equal(learningItemRenderer({ lessonlearningtype: 'video' }), 'video');
  assert.equal(isLearningItemSupported({ lessonlearningtype: 'video' }), true);
});

check('every other type of the design note gets the placeholder', () => {
  for (const type of ['document', 'audio', 'gallery', 'cards', 'package', 'link']) {
    assert.equal(
      learningItemRenderer({ lessonlearningtype: type }),
      'unsupported',
      type,
    );
  }
});

check('a type nobody has heard of is the placeholder, never a throw', () => {
  assert.equal(learningItemRenderer({ lessonlearningtype: 'hologram' }), 'unsupported');
  assert.equal(learningItemRenderer({ lessonlearningtype: ' video ' }), 'video'); // whitespace is trimmed
});

check('type matching is exact: "Video" is not "video"', () => {
  assert.equal(learningItemRenderer({ lessonlearningtype: 'Video' }), 'unsupported');
});

check('a missing type is video (older server, older cached payload)', () => {
  assert.equal(resolveLearningItemType({}), 'video');
  assert.equal(resolveLearningItemType(undefined), 'video');
  assert.equal(resolveLearningItemType(null), 'video');
  assert.equal(resolveLearningItemType({ lessonlearningtype: null }), 'video');
  assert.equal(resolveLearningItemType({ lessonlearningtype: '' }), 'video');
  assert.equal(resolveLearningItemType({ lessonlearningtype: 7 }), 'video');
  assert.equal(learningItemRenderer({}), 'video');
  assert.equal(DEFAULT_LEARNING_ITEM_TYPE, 'video');
});

check('the supported list is what the header advertises', () => {
  assert.deepEqual([...SUPPORTED_LEARNING_ITEM_TYPES], ['video']);
});

type Step = { id: string; unsupported: boolean };
const statuses: Record<string, 'done' | 'inProgress' | 'todo'> = {};
const statusFor = (id: string) => statuses[id] ?? 'todo';
const openable = (s: Step) => !s.unsupported;

check('next step skips an unsupported item that precedes a playable one', () => {
  const steps: Step[] = [
    { id: 'gallery', unsupported: true },
    { id: 'video', unsupported: false },
  ];
  assert.equal(pickNextStep(steps, statusFor, openable)?.id, 'video');
});

check('next step: with only unsupported items left there is none (the footer hides)', () => {
  const steps: Step[] = [
    { id: 'v1', unsupported: false },
    { id: 'gallery', unsupported: true },
  ];
  statuses.v1 = 'done';
  assert.equal(pickNextStep(steps, statusFor, openable), undefined);
  delete statuses.v1;
});

check('next step: unchanged for an all-video lesson (first not-done)', () => {
  const steps: Step[] = [
    { id: 'a', unsupported: false },
    { id: 'b', unsupported: false },
    { id: 'p', unsupported: false },
  ];
  assert.equal(pickNextStep(steps, statusFor, openable)?.id, 'a');
  statuses.a = 'done';
  assert.equal(pickNextStep(steps, statusFor, openable)?.id, 'b');
  statuses.b = 'inProgress';
  assert.equal(pickNextStep(steps, statusFor, openable)?.id, 'b');
  delete statuses.a;
  delete statuses.b;
});

check('the lesson cache keeps the new fields and tolerates a lesson without them', () => {
  const lesson: any = {
    lessonid: 'L1',
    lessonlearnings: [
      { lessonlearningid: 'a', lessonlearningname: 'A', lessonlearningorder: 1 }, // cached by an older build
      {
        lessonlearningid: 'b',
        lessonlearningname: 'B',
        lessonlearningorder: 2,
        lessonlearningtype: 'gallery',
        lessonlearningbody: { v: 1, captions: {} },
        documents: [{ documentid: 'd1', role: 'asset', order: 1 }],
      },
    ],
  };
  const state = lessonCacheSlice.reducer(undefined, LessonCacheActions.cacheLesson(lesson));
  const cached: any = state.byId.L1;
  assert.equal(resolveLearningItemType(cached.lessonlearnings[0]), 'video');
  assert.equal(learningItemRenderer(cached.lessonlearnings[0]), 'video');
  assert.equal(cached.lessonlearnings[1].lessonlearningtype, 'gallery');
  assert.deepEqual(cached.lessonlearnings[1].documents, [
    { documentid: 'd1', role: 'asset', order: 1 },
  ]);
  assert.equal(learningItemRenderer(cached.lessonlearnings[1]), 'unsupported');
  // a JSON round trip, as redux-persist does
  const revived: any = JSON.parse(JSON.stringify(state)).byId.L1;
  assert.equal(learningItemRenderer(revived.lessonlearnings[0]), 'video');
  assert.equal(learningItemRenderer(revived.lessonlearnings[1]), 'unsupported');
});

console.log(`learningItems: ${passed} checks passed`);
