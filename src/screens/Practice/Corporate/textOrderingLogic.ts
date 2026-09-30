// Corporate word ordering (template 5): grading, marks and the read-back.
// No react-native imports (tested in plain node).
//
// Grading is today's rule (gradeArrangeText, shared with the kids renderer),
// so `iscorrect` and `answer` are what the kids path sends for the same
// final order.
import _ from 'lodash';
import { gradeArrangeText } from '../Components/ArrangeText/arrangeTextGrade';
import type { ItemMark, QuestionEvaluation } from './types';

/** The slice of a QuestionOption this body reads. */
export interface OrderingOption {
  questionoptionid: string;
  questionoptiontext: string;
  questionoptionsequence: number;
}

const KHMER = /[ក-៿]/;

/**
 * The finished sentence, as the correct strip reads it back. Khmer is
 * written without spaces between words (the gaps between tiles only mark
 * the movable pieces); other scripts are joined with a space.
 */
export function readBackSentence(words: ReadonlyArray<string>): string {
  const clean = words.map(w => w.trim()).filter(Boolean);
  return clean.some(w => KHMER.test(w)) ? clean.join('') : clean.join(' ');
}

/** Options by id, then the ids in a given order (unknown ids are dropped). */
export function optionsInOrder<T extends OrderingOption>(
  options: ReadonlyArray<T>,
  ids: ReadonlyArray<string>,
): T[] {
  const byId = new Map(options.map(o => [o.questionoptionid, o]));
  return ids.map(id => byId.get(id)).filter((o): o is T => !!o);
}

/** The correct order, by `questionoptionsequence` (stable for equal ones). */
export function correctOrder<T extends OrderingOption>(options: ReadonlyArray<T>): T[] {
  return _.sortBy(options, 'questionoptionsequence');
}

/**
 * Which words are in the right place: the word at position i is right when
 * its sequence equals the i-th smallest sequence. Equal sequences may sit in
 * either order (today's rule), and an order that grades correct marks every
 * word correct.
 */
export function wordMarks(
  ordered: ReadonlyArray<OrderingOption>,
): Record<string, ItemMark> {
  const sorted = ordered.map(o => o.questionoptionsequence).sort((a, b) => a - b);
  const marks: Record<string, ItemMark> = {};
  ordered.forEach((o, i) => {
    marks[o.questionoptionid] = o.questionoptionsequence === sorted[i] ? 'correct' : 'incorrect';
  });
  return marks;
}

/**
 * Submit: today's grade, the mark on each word, and the count for the strip.
 * `ids` is the learner's current order. The read-back is the learner's
 * sentence, and is only shown by the shell on a correct answer, where it is
 * the correct sentence.
 */
export function evaluateTextOrdering(
  options: ReadonlyArray<OrderingOption> | null | undefined,
  ids: ReadonlyArray<string>,
): QuestionEvaluation {
  const ordered = optionsInOrder(options ?? [], ids);
  const { isCorrect, answer } = gradeArrangeText(options, ordered);
  const perItem = wordMarks(ordered);
  return {
    iscorrect: isCorrect,
    answer,
    perItem,
    summary: {
      correctCount: Object.values(perItem).filter(m => m === 'correct').length,
      total: ordered.length,
      readBack: readBackSentence(ordered.map(o => o.questionoptiontext)),
    },
  };
}

export type WordState = 'default' | 'picked' | 'correct' | 'incorrect';

/** How one tile looks: the answer when shown, else its mark, else its pick state. */
export function wordState(
  id: string,
  opts: {
    picked: boolean;
    marks: Readonly<Record<string, ItemMark>> | null;
    showAnswer: boolean;
  },
): WordState {
  if (opts.showAnswer) return 'correct';
  if (opts.marks) return opts.marks[id] ?? 'default';
  return opts.picked ? 'picked' : 'default';
}
