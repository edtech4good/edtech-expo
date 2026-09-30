// Corporate fill in the blank (template 8): the pure rules. No react-native
// imports, so they run in plain node (`yarn test:fillblank`).
//
// Grading is today's rule (gradeFillBlank, shared with the kids renderer), so
// `iscorrect` and `answer` are what the kids path sends for the same final
// filling: tile ids in blank order, distractors keeping their own ids.
import _ from 'lodash';
import {
  FillBlankOption,
  gradeFillBlank,
} from '../../Components/FillBlank/fillBlankGrade';
import type { ItemMark, QuestionEvaluation } from '../types';

/** The marker the question text uses for a blank. */
export const BLANK_MARKER = '-----';

// ---------------------------------------------------------------------------
// The sentence
// ---------------------------------------------------------------------------

export type SentencePiece =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; index: number };

/**
 * A unit is the text and blanks with no space between them. Units are what
 * wrap onto the next line, so a blank never separates from the full stop that
 * follows it, and Khmer (which has few spaces) breaks only where its text
 * has a space or a blank.
 */
export type SentenceUnit = SentencePiece[];

/**
 * Split the question text into units of text and blanks.
 * The first `blankCount` markers become blanks (numbered from 0); a marker
 * beyond that stays as text, as today's renderer leaves it. If the text has
 * fewer markers than `blankCount` (a data slip), the missing blanks are
 * appended after the sentence so every option still has a place.
 */
export function parseSentence(text: string | null | undefined, blankCount: number): SentenceUnit[] {
  const parts = (text ?? '').split(BLANK_MARKER);
  const pieces: SentencePiece[] = [];
  let next = 0;
  parts.forEach((part, i) => {
    if (part !== '') pieces.push({ kind: 'text', text: part });
    if (i < parts.length - 1) {
      if (next < blankCount) pieces.push({ kind: 'blank', index: next++ });
      else pieces.push({ kind: 'text', text: '_____' });
    }
  });
  while (next < blankCount) {
    pieces.push({ kind: 'text', text: ' ' });
    pieces.push({ kind: 'blank', index: next++ });
  }

  // Break the text pieces on whitespace into units.
  const units: SentenceUnit[] = [];
  let current: SentenceUnit = [];
  const flush = () => {
    if (current.length) units.push(current);
    current = [];
  };
  for (const piece of pieces) {
    if (piece.kind === 'blank') {
      current.push(piece);
      continue;
    }
    // Whitespace runs separate units; the text between them belongs to one.
    const chunks = piece.text.split(/(\s+)/);
    for (const chunk of chunks) {
      if (chunk === '') continue;
      if (/^\s+$/.test(chunk)) flush();
      else current.push({ kind: 'text', text: chunk });
    }
  }
  flush();
  return units;
}

/** A short text right after a blank (a full stop, a Khmer particle) stays with it. */
export const GLUE_MAX = 3;

/**
 * Within a unit, the pieces that must not be split across lines: a blank with
 * the short text that follows it. Everything else is its own group. Khmer has
 * no spaces, so a whole sentence can be one unit; its groups wrap like words.
 */
export function groupUnit(unit: SentenceUnit): SentencePiece[][] {
  const groups: SentencePiece[][] = [];
  for (const piece of unit) {
    const last = groups[groups.length - 1];
    if (
      piece.kind === 'text' &&
      last &&
      last.length === 1 &&
      last[0].kind === 'blank' &&
      Array.from(piece.text).length <= GLUE_MAX
    ) {
      last.push(piece);
    } else groups.push([piece]);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Filling and emptying the blanks
// ---------------------------------------------------------------------------

/** What is in each blank (a tile id, or null) and which blank a tap will fill. */
export interface BlankState {
  filled: ReadonlyArray<string | null>;
  /** Index of the active blank. */
  active: number;
}

export function emptyBlanks(blankCount: number): BlankState {
  return { filled: Array.from({ length: blankCount }, () => null), active: 0 };
}

/** The first empty blank at or after `from`, else the first empty one; -1 if none. */
function nextEmpty(filled: ReadonlyArray<string | null>, from: number): number {
  for (let i = from; i < filled.length; i++) if (filled[i] === null) return i;
  return filled.findIndex(f => f === null);
}

/**
 * Tap a word in the bank: it fills the active blank and the active blank
 * moves to the next empty one. A word already placed, or a bank with every
 * blank full, does nothing.
 */
export function fillActive(state: BlankState, tileId: string): BlankState {
  if (state.filled.includes(tileId)) return state;
  const at = state.filled[state.active] === null ? state.active : nextEmpty(state.filled, 0);
  if (at < 0 || state.filled[at] !== null) return state;
  const filled = state.filled.slice();
  filled[at] = tileId;
  const active = nextEmpty(filled, at + 1);
  return { filled, active: active < 0 ? at : active };
}

/**
 * Tap a blank. A filled blank is emptied (its word goes back to the bank) and
 * becomes the active blank; an empty blank becomes the active blank.
 */
export function tapBlank(state: BlankState, index: number): BlankState {
  if (index < 0 || index >= state.filled.length) return state;
  if (state.filled[index] === null) {
    return state.active === index ? state : { ...state, active: index };
  }
  const filled = state.filled.slice();
  filled[index] = null;
  return { filled, active: index };
}

/** Every blank holds a word: Submit is enabled. */
export function isReady(filled: ReadonlyArray<string | null>): boolean {
  return filled.every(f => f !== null);
}

/** The bank shows a word as used once it sits in a blank. */
export function isUsed(filled: ReadonlyArray<string | null>, tileId: string): boolean {
  return filled.includes(tileId);
}

/** Show answer: every blank holds its right word (options in sequence order). */
export function answerBlanks(
  questionOptions: ReadonlyArray<FillBlankOption>,
): BlankState {
  const sorted = _.sortBy(questionOptions, o => o.questionoptionsequence);
  return { filled: sorted.map(o => o.questionoptionid), active: -1 };
}

// ---------------------------------------------------------------------------
// Grading and marks
// ---------------------------------------------------------------------------

/**
 * Submit: today's grade, plus a mark on each blank. A blank is right when its
 * word is a correct option in the place its sequence says. The marks are the
 * grade taken one blank at a time (all right exactly when `iscorrect`), and
 * the strip's "N of M" counts them.
 *
 * `tiles` are every word in the bank (the options and the distractors),
 * looked up by id; `filled` is what is in each blank.
 */
export function evaluateFillBlank(
  questionOptions: ReadonlyArray<FillBlankOption>,
  tiles: ReadonlyArray<FillBlankOption>,
  filled: ReadonlyArray<string | null>,
): QuestionEvaluation {
  const byId = new Map(tiles.map(t => [t.questionoptionid, t]));
  const selections: FillBlankOption[] = [];
  for (const id of filled) {
    const tile = id === null ? undefined : byId.get(id);
    if (tile) selections.push(tile);
  }
  const { isCorrect, answer } = gradeFillBlank(questionOptions, selections);

  const required = questionOptions.length;
  const sequences = _.sortBy(
    questionOptions.map(o => o.questionoptionsequence).filter(_.isNumber),
  );
  const perItem: Record<string, ItemMark> = {};
  let correctCount = 0;
  filled.forEach((id, i) => {
    const tile = id === null ? undefined : byId.get(id);
    if (!tile) return;
    const right =
      _.isNumber(tile.questionoptionsequence) &&
      tile.questionoptionsequence === sequences[i] &&
      (required <= 1 || tile.questionoptioniscorrect === true);
    perItem[tile.questionoptionid] = right ? 'correct' : 'incorrect';
    if (right) correctCount += 1;
  });

  return {
    iscorrect: isCorrect,
    answer,
    perItem,
    summary: { correctCount, total: required },
  };
}

/** How one blank looks. */
export type BlankSlotState = 'empty' | 'active' | 'filled' | 'correct' | 'incorrect';

export function blankSlotState(opts: {
  tileId: string | null;
  index: number;
  active: number;
  marks: Readonly<Record<string, ItemMark>> | null;
  showAnswer: boolean;
}): BlankSlotState {
  if (opts.tileId === null) return opts.index === opts.active ? 'active' : 'empty';
  if (opts.showAnswer) return 'correct';
  if (opts.marks) return opts.marks[opts.tileId] ?? 'filled';
  return 'filled';
}
