// Corporate matching (template 7): the tap state machine, readiness, grading
// and marks. No react-native imports (tested in plain node).
//
// Vocabulary. Each question option is a prompt AND the id of its slot; its
// `questionassociate` is the answer chip that belongs on it. So a chip is
// named by the id of the option it belongs to, and a correct answer maps every
// id to itself (`placed[slotId] === slotId`). This is today's model.
//
// Grading is today's rule (gradeMatching, shared with the kids renderer), so
// `iscorrect` and `answer` are what the kids path sends for the same pairing.
import _ from 'lodash';
import {
  gradeMatching,
  MatchAnswers,
  MatchedOption,
} from '../Components/DragDrop/matchingGrade';
import type { ItemMark, QuestionEvaluation } from './types';

/** slot id -> the chip (option id) placed on it. A slot with no chip has no key. */
export type Placed = Readonly<Record<string, string>>;

export interface MatchTapState {
  placed: Placed;
  /** A chip picked from the bank, waiting for a slot. */
  pickedChip: string | null;
  /** A slot tapped while empty, waiting for a chip. Never set with pickedChip. */
  activeSlot: string | null;
}

export const EMPTY_MATCH: MatchTapState = { placed: {}, pickedChip: null, activeSlot: null };

/** Chips that are in a slot (their bank spot shows a dashed ghost). */
export function placedChips(placed: Placed): Set<string> {
  return new Set(Object.values(placed));
}

/**
 * Tap a chip in the bank. A chip already placed is a ghost: nothing happens.
 * If a slot was waiting, the chip goes straight into it. Otherwise the chip
 * is picked; tapping the picked chip again puts it down.
 */
export function pressChip(s: MatchTapState, chipId: string): MatchTapState {
  if (placedChips(s.placed).has(chipId)) return s;
  if (s.activeSlot !== null) {
    return {
      placed: { ...s.placed, [s.activeSlot]: chipId },
      pickedChip: null,
      activeSlot: null,
    };
  }
  return { ...s, pickedChip: s.pickedChip === chipId ? null : chipId };
}

/**
 * Tap a slot.
 * - A chip is picked: it goes into the slot. If the slot was filled, the
 *   chip that was there goes back to the bank.
 * - Nothing picked, slot filled: the chip goes back to the bank.
 * - Nothing picked, slot empty: the slot waits for a chip (tap it again to
 *   stop waiting; tap another empty slot to move the wait).
 */
export function pressSlot(s: MatchTapState, slotId: string): MatchTapState {
  if (s.pickedChip !== null) {
    return {
      placed: { ...s.placed, [slotId]: s.pickedChip },
      pickedChip: null,
      activeSlot: null,
    };
  }
  if (slotId in s.placed) {
    return { placed: _.omit(s.placed, slotId), pickedChip: null, activeSlot: null };
  }
  return { ...s, activeSlot: s.activeSlot === slotId ? null : slotId };
}

/** Submit is enabled only when every slot holds a chip. */
export function isReady(placed: Placed, slotIds: ReadonlyArray<string>): boolean {
  return slotIds.length > 0 && slotIds.every(id => !_.isEmpty(placed[id]));
}

/** After Show answer: every slot holds its own chip. */
export function correctPlacement(slotIds: ReadonlyArray<string>): Record<string, string> {
  return Object.fromEntries(slotIds.map(id => [id, id]));
}

/**
 * Submit: today's grade, plus a mark on each slot the learner filled (its own
 * correctness), and the counts for the strip. A wrong slot does not reveal
 * its right answer: that stays behind "Show answer".
 */
export function evaluateMatching(
  options: ReadonlyArray<MatchedOption> | null | undefined,
  placed: Placed,
): QuestionEvaluation {
  const answers: MatchAnswers = { ...placed };
  const { isCorrect, answer } = gradeMatching(options, answers);
  const perItem: Record<string, ItemMark> = {};
  let correctCount = 0;
  for (const o of options ?? []) {
    const chip = placed[o.questionoptionid];
    if (_.isEmpty(chip)) continue;
    const right = chip === o.questionoptionid;
    if (right) correctCount += 1;
    perItem[o.questionoptionid] = right ? 'correct' : 'incorrect';
  }
  return {
    iscorrect: isCorrect,
    answer,
    perItem,
    summary: { correctCount, total: (options ?? []).length },
  };
}

export type MatchSlotState = 'empty' | 'target' | 'active' | 'filled' | 'correct' | 'incorrect';

/** How one slot looks: the answer when shown, else its mark, else the tap state. */
export function slotState(
  slotId: string,
  s: MatchTapState,
  opts: { marks: Readonly<Record<string, ItemMark>> | null; showAnswer: boolean },
): MatchSlotState {
  if (opts.showAnswer) return 'correct';
  if (opts.marks) return opts.marks[slotId] ?? 'filled';
  if (slotId in s.placed) return 'filled';
  if (s.activeSlot === slotId) return 'active';
  if (s.pickedChip !== null) return 'target';
  return 'empty';
}

export type ChipState = 'default' | 'picked' | 'used';

/** How one bank chip looks. */
export function chipState(chipId: string, s: MatchTapState): ChipState {
  if (placedChips(s.placed).has(chipId)) return 'used';
  return s.pickedChip === chipId ? 'picked' : 'default';
}

// ---- content -------------------------------------------------------------

/** Files of type 6 are pictures (as today's DropItem and DragItem check); any other file is audio. */
export type ContentKind = 'text' | 'image' | 'audio';

export interface ContentLike {
  text?: string | null;
  file?: { filename?: string | null; filetype?: number | null } | null;
}

export function contentKind(c: ContentLike): { kind: ContentKind; hasFile: boolean; hasText: boolean } {
  const hasFile = !_.isEmpty(c.file?.filename);
  const hasText = !_.isEmpty((c.text ?? '').trim());
  const kind: ContentKind = !hasFile ? 'text' : c.file?.filetype === 6 ? 'image' : 'audio';
  return { kind, hasFile, hasText };
}
