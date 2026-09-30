// Corporate picture ordering (template 6): grading, marks and tile states.
// No react-native imports (tested in plain node).
//
// Grading is today's rule (gradeArrangeImage, shared with the kids renderer),
// so `iscorrect` and `answer` are what the kids path sends for the same final
// order.
import _ from 'lodash';
import {
  gradeArrangeImage,
  type OrderedOption,
} from '../../Components/ArrangeImage/arrangeImageGrade';
import type { ItemMark, QuestionEvaluation } from '../types';

/** Each picture's id and where it belongs, the slice the body needs. */
export type OrderingOption = OrderedOption;

/** The options laid out in the order of `ids` (ids that match no option are skipped). */
export function optionsInOrder<T extends OrderingOption>(
  options: ReadonlyArray<T>,
  ids: ReadonlyArray<string>,
): T[] {
  const byId = _.keyBy(options, o => o.questionoptionid);
  return _.compact(ids.map(id => byId[id]));
}

/** The pictures in their correct order (Show answer). Ties keep their given order. */
export function correctOrder<T extends OrderingOption>(options: ReadonlyArray<T>): T[] {
  return _.sortBy(options, o => o.questionoptionsequence);
}

/**
 * Submit: today's grade, plus a mark on every picture, since the learner
 * placed them all. A picture is right when it sits where a picture with its
 * sequence belongs (position i holds the i-th lowest sequence), so equal
 * sequences are interchangeable, as they are for the grade. When the whole
 * order grades correct every picture is marked correct, whatever the numbers,
 * so the marks and the strip can never disagree with `iscorrect`.
 */
export function evaluateImageOrdering<T extends OrderingOption>(
  options: ReadonlyArray<T>,
  ids: ReadonlyArray<string>,
): QuestionEvaluation {
  const placed = optionsInOrder(options, ids);
  const { correct, answer } = gradeArrangeImage(placed);
  const target = correctOrder(placed);
  const perItem: Record<string, ItemMark> = {};
  placed.forEach((o, i) => {
    perItem[o.questionoptionid] =
      correct || o.questionoptionsequence === target[i].questionoptionsequence
        ? 'correct'
        : 'incorrect';
  });
  const correctCount = _.filter(perItem, m => m === 'correct').length;
  return {
    iscorrect: correct,
    answer,
    perItem,
    summary: { correctCount, total: placed.length },
  };
}

export type PictureTileState = 'default' | 'picked' | 'dragging' | 'correct' | 'incorrect';

/** How one picture looks: the answer when shown, else its mark, else what the drag is doing. */
export function pictureTileState(
  id: string,
  opts: {
    picked: boolean;
    lifted: boolean;
    marks: Readonly<Record<string, ItemMark>> | null;
    showAnswer: boolean;
  },
): PictureTileState {
  if (opts.showAnswer) return 'correct';
  if (opts.marks) return opts.marks[id] ?? 'default';
  if (opts.lifted) return 'dragging';
  return opts.picked ? 'picked' : 'default';
}

/** FileType.AUDIO in the API (edtech-lms-api models/enums/filetype.enum). */
export const FILE_TYPE_AUDIO = 1;

/**
 * An option has one file. Today's ArrangeImage shows it as the picture
 * whatever it is; here an audio file (type 1, or an .mp3 name) is that
 * picture's audio instead, and the tile shows the labelled placeholder for
 * its missing picture. Anything else is the picture, as before.
 */
export function optionMedia(option: {
  questionoptionfile?: { filename?: string; filetype?: number; fileext?: string } | null;
}): { imageName: string; audioName: string } {
  const f = option.questionoptionfile;
  const name = f?.filename ?? '';
  if (_.isEmpty(name)) return { imageName: '', audioName: '' };
  const isAudio =
    f?.filetype === FILE_TYPE_AUDIO ||
    (f?.filetype === undefined && /\.mp3$/i.test(name)) ||
    (f?.filetype === undefined && f?.fileext?.toLowerCase() === 'mp3');
  return isAudio ? { imageName: '', audioName: name } : { imageName: name, audioName: '' };
}

/** Tries before giving up on finding a wrong order (see shuffleNotCorrect). */
export const SHUFFLE_TRIES = 50;

/**
 * The starting order of an attempt: shuffled, and never already correct when
 * a wrong order exists. Every picture starts placed, so an untouched Submit
 * would otherwise record a pass (1 time in 6 for three pictures). It reshuffles
 * until the shared grade says wrong, at most SHUFFLE_TRIES times; when there is
 * no wrong order (one picture, or every sequence equal) the last shuffle is
 * used, so it always ends.
 */
export function shuffleNotCorrect<T extends OrderingOption>(
  options: ReadonlyArray<T>,
  random: () => number = Math.random,
): T[] {
  const once = () => {
    const a = [...options];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  let order = once();
  for (let n = 1; n < SHUFFLE_TRIES && gradeArrangeImage(order).correct; n++) order = once();
  return order;
}

/** "A", "B", ... for the nth picture in the starting order (26 is plenty). */
export function pictureLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}
