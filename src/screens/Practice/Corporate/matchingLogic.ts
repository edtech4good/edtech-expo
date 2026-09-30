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

// ---- labels ----------------------------------------------------------------
// Prompts are numbered by their row ("Sound 2"). Answers must NOT be: an
// answer numbered like its prompt would tell the learner the pairing. So
// answers get letters in the order they sit in the bank, and the bank is never
// in the prompts' order (see `bankOrder`).

export type Tr = (key: string, opts?: Record<string, unknown>) => string;

interface OptionLike {
  questionoptionid: string;
  questionoptiontext?: string | null;
  questionoptionfile?: ContentLike['file'];
  questionassociate?: {
    questionassociatetext?: string | null;
    questionassociatefile?: ContentLike['file'];
  } | null;
}

export function promptParts(o: OptionLike) {
  return contentKind({ text: o.questionoptiontext, file: o.questionoptionfile });
}
export function answerParts(o: OptionLike) {
  return contentKind({
    text: o.questionassociate?.questionassociatetext,
    file: o.questionassociate?.questionassociatefile,
  });
}

/** A, B, C ... then Z2, Z3 for a (very) long list. */
export function letterFor(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : `Z${i - 24}`;
}

/**
 * The bank order: a shuffle in which no answer sits at its own prompt's
 * position, so bank position (and the letter that follows it) never matches
 * the prompt's row. One item cannot move, so it stays.
 */
export function bankOrder(ids: ReadonlyArray<string>, rng: () => number = Math.random): string[] {
  if (ids.length < 2) return [...ids];
  for (;;) {
    const out = [...ids];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.every((id, i) => id !== ids[i])) return out;
  }
}

/** answer id -> its letter, by bank position. It follows the chip into a slot and back. */
export function answerLetters(bank: ReadonlyArray<string>): Record<string, string> {
  return Object.fromEntries(bank.map((id, i) => [id, letterFor(i)]));
}

/** What a prompt is called in words and to a screen reader: its text, else "Sound 2" / "Picture 2". */
export function promptName(o: OptionLike, n: number, t: Tr): string {
  const p = promptParts(o);
  if (p.hasText) return o.questionoptiontext as string;
  return p.kind === 'audio'
    ? t('corporate.matching.promptSound', { n })
    : t('corporate.matching.promptPicture', { n });
}
/** What is drawn as the prompt's text: a picture-only prompt shows its picture, not a caption. */
export function promptVisual(o: OptionLike, n: number, t: Tr): string {
  const p = promptParts(o);
  if (p.hasText) return o.questionoptiontext as string;
  return p.kind === 'audio' ? t('corporate.matching.promptSound', { n }) : '';
}
/** An answer's words, else "Answer sound B" / "Picture B" (its bank letter, never its prompt's number). */
export function answerName(o: OptionLike, letter: string, t: Tr): string {
  const a = answerParts(o);
  if (a.hasText) return o.questionassociate?.questionassociatetext as string;
  if (a.kind === 'audio') return t('corporate.matching.answerSound', { letter });
  if (a.kind === 'image') return t('corporate.matching.answerPicture', { letter });
  return '';
}

/**
 * The slot's screen-reader label: it names its prompt, then what is in it
 * (or what would go in it).
 */
export function slotA11yLabel(
  input: { prompt: string; answer: string; state: MatchSlotState; pickedName: string },
  t: Tr,
): string {
  const { prompt, answer, state, pickedName } = input;
  switch (state) {
    case 'filled':
      return t('corporate.matching.slotFilled', { prompt, answer });
    case 'correct':
      return t('kit.mark.labelCorrect', { label: `${prompt}: ${answer}` });
    case 'incorrect':
      return t('kit.mark.labelIncorrect', { label: `${prompt}: ${answer}` });
    case 'target':
      return t('corporate.matching.slotTarget', { prompt, chip: pickedName });
    case 'active':
      return t('corporate.matching.slotActive', { prompt });
    default:
      return t('corporate.matching.slotEmpty', { prompt });
  }
}

/**
 * The line above the list. "the word it matches" only when every prompt is a
 * word; a picture or sound prompt says "the prompt it matches".
 */
export function instructionText(
  input: { tap: MatchTapState; allText: boolean; pickedName: string; activePrompt: string },
  t: Tr,
): string {
  const { tap, allText, pickedName, activePrompt } = input;
  if (tap.pickedChip !== null)
    return t(allText ? 'corporate.matching.pickedHint' : 'corporate.matching.pickedHintPrompt', {
      label: pickedName,
    });
  if (tap.activeSlot !== null) return t('corporate.matching.slotHint', { label: activePrompt });
  return t(allText ? 'corporate.matching.instruction' : 'corporate.matching.instructionPrompt');
}
