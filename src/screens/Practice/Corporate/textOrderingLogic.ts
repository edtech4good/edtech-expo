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

/**
 * What a screen reader hears after the word's label and position: its mark
 * after Submit, or "Correct" on every word of the shown answer; nothing
 * while answering. A translation key (kit.mark.*), or undefined.
 */
export function wordStatusKey(
  id: string,
  opts: {
    marks: Readonly<Record<string, ItemMark>> | null;
    showAnswer: boolean;
  },
): 'kit.mark.correct' | 'kit.mark.incorrect' | undefined {
  const s = wordState(id, { picked: false, ...opts });
  if (s === 'correct') return 'kit.mark.correct';
  if (s === 'incorrect') return 'kit.mark.incorrect';
  return undefined;
}

/** A source of numbers in [0, 1), like Math.random (tests pass a seeded one). */
export type Rng = () => number;

function fisherYates<T>(xs: ReadonlyArray<T>, rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Whether some order of these options grades wrong (false when all sequences are equal, or under two options). */
export function hasWrongOrder(options: ReadonlyArray<OrderingOption>): boolean {
  return new Set(options.map(o => o.questionoptionsequence)).size > 1;
}

/**
 * The starting order of an attempt: shuffled, and never already correct
 * (an untouched Submit must not pass). It reshuffles a bounded number of
 * times, then falls back to the correct order with one out-of-order pair
 * swapped, so it always ends. When every sequence is equal no wrong order
 * exists, and the plain shuffle is used.
 */
export function shuffledNotSolved<T extends OrderingOption>(
  options: ReadonlyArray<T>,
  rng: Rng = Math.random,
  maxTries = 30,
): T[] {
  if (!hasWrongOrder(options)) return fisherYates(options, rng);
  for (let i = 0; i < maxTries; i++) {
    const candidate = fisherYates(options, rng);
    if (!gradeArrangeText(options, candidate).isCorrect) return candidate;
  }
  const sorted = correctOrder(options);
  const k = sorted.findIndex((o, i) => i > 0 && o.questionoptionsequence !== sorted[i - 1].questionoptionsequence);
  [sorted[k - 1], sorted[k]] = [sorted[k], sorted[k - 1]];
  return sorted;
}

export type ListStatus =
  | { kind: 'idle' }
  | { kind: 'picked'; id: string; label: string }
  | { kind: 'dragging'; id: string; label: string; target: string | null };

/**
 * The instruction line's content for the list's status: which i18n keys,
 * and with what values. `lead` is the part shown in bold.
 */
export function bannerFor(status: ListStatus): {
  live: boolean;
  lead?: { key: string; values?: Record<string, string> };
  rest: { key: string; values?: Record<string, string> } | null;
} {
  switch (status.kind) {
    case 'picked':
      return {
        live: true,
        lead: { key: 'corporate.textOrdering.picked', values: { label: status.label } },
        rest: { key: 'corporate.textOrdering.pickedHelp' },
      };
    case 'dragging':
      return {
        live: true,
        lead: { key: 'corporate.textOrdering.moving', values: { label: status.label } },
        rest: status.target
          ? { key: 'corporate.textOrdering.movingTo', values: { place: status.target } }
          : { key: 'corporate.textOrdering.movingBack' },
      };
    default:
      return { live: false, rest: null };
  }
}
