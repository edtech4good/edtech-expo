/**
 * "Answer v1": the learner's actual response to a question, sent alongside
 * `iscorrect` so the server can grade it itself.
 *
 * Pure module — no react-native, no store — so the mapping runs under plain
 * node (`yarn test:answer`). Each builder turns what a renderer already
 * holds into an `AnswerV1`, or `null` when the response cannot be sent
 * within the server's size limits (a `null` answer is treated by the server
 * as "no attempt", exactly like leaving the field out).
 *
 * Ids are option ids (uuids) from the question's own options:
 *   choice    templates 1-4, 18   selected option ids
 *   order     templates 5-6       option ids in the learner's order
 *   match     template 7          target option id -> dragged option id
 *   blanks    template 8          tile ids in blank order
 *   counts    templates 19-20     option id -> tap count
 *   text      templates 21-23     option id -> typed text
 *   fraction  template 24         option id -> { numerator, denominator }
 *
 * Size limits (the result endpoints reject the WHOLE submission when one
 * item breaks them): a string is at most 200 characters, an array or record
 * at most 50 entries. Ids and structure are never truncated (a cut-off id
 * would name a different option); such an answer is dropped (`null`).
 * Typed text is the only thing shortened.
 *
 * The endpoints also reject an empty string anywhere in an answer. So an
 * empty typed entry is left out (a missing entry grades as empty), and any
 * other answer that would contain '' (a fraction with an empty part, say)
 * is sent as `null`, "no attempt". See `noEmptyStrings`.
 */

export type AnswerV1 =
  | { v: 1; type: 'choice'; selected: string[] }
  | { v: 1; type: 'order'; order: string[] }
  | { v: 1; type: 'match'; pairs: Record<string, string> }
  | { v: 1; type: 'blanks'; filled: string[] }
  | { v: 1; type: 'counts'; counts: Record<string, number> }
  | { v: 1; type: 'text'; entries: Record<string, string> }
  | {
      v: 1;
      type: 'fraction';
      parts: Record<string, { numerator: string; denominator: string }>;
    };

export const ANSWER_MAX_STRING = 200;
export const ANSWER_MAX_ENTRIES = 50;

const isId = (x: unknown): x is string =>
  typeof x === 'string' && x.length > 0 && x.length <= ANSWER_MAX_STRING;

/** Cuts typed text to the limit without splitting a surrogate pair. */
export function clampText(value: unknown): string {
  const s = typeof value === 'string' ? value : '';
  if (s.length <= ANSWER_MAX_STRING) return s;
  let end = ANSWER_MAX_STRING;
  const last = s.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1; // lone high surrogate
  return s.slice(0, end);
}

/**
 * Final guard on every builder's output: an answer with an empty string
 * anywhere in it is never returned (it would get the whole submission
 * rejected). Builders leave empty typed entries out before this runs, so
 * this only catches what they did not anticipate.
 */
export function noEmptyStrings(answer: AnswerV1 | null): AnswerV1 | null {
  if (!answer) return null;
  const hasEmpty = (x: unknown): boolean => {
    if (x === '') return true;
    if (Array.isArray(x)) return x.some(hasEmpty);
    if (x && typeof x === 'object')
      return Object.entries(x).some(([k, v]) => k === '' || hasEmpty(v));
    return false;
  };
  return hasEmpty(answer) ? null : answer;
}

/** A list of ids, or null when it is not one or is over the limits. */
function idList(ids: ReadonlyArray<unknown> | null | undefined): string[] | null {
  if (!Array.isArray(ids)) return null;
  if (ids.length > ANSWER_MAX_ENTRIES) return null;
  if (!ids.every(isId)) return null;
  return [...(ids as string[])];
}

/** Own entries of a record whose keys are ids, or null when over the limits. */
function idKeyedEntries<T>(
  rec: Record<string, T> | null | undefined,
): Array<[string, T]> | null {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return null;
  const entries = Object.entries(rec);
  if (entries.length > ANSWER_MAX_ENTRIES) return null;
  if (!entries.every(([k]) => isId(k))) return null;
  return entries;
}

/** Selected option ids, in any order. */
export function choiceAnswer(
  selectedIds: ReadonlyArray<string> | null | undefined,
): AnswerV1 | null {
  const selected = idList(selectedIds);
  return selected ? noEmptyStrings({ v: 1, type: 'choice', selected }) : null;
}

/** Option ids in the order the learner placed them. */
export function orderAnswer(
  orderedIds: ReadonlyArray<string> | null | undefined,
): AnswerV1 | null {
  const order = idList(orderedIds);
  return order ? noEmptyStrings({ v: 1, type: 'order', order }) : null;
}

/**
 * `answers` as the drag/drop renderer holds it: drop-target option id ->
 * id of the option the learner placed there. Empty targets ('' or missing)
 * are left out.
 */
export function matchAnswer(
  answers: Record<string, string | undefined> | null | undefined,
): AnswerV1 | null {
  const entries = idKeyedEntries(answers);
  if (!entries) return null;
  const pairs: Record<string, string> = {};
  for (const [target, dragged] of entries) {
    if (dragged === undefined || dragged === '') continue;
    if (!isId(dragged)) return null;
    pairs[target] = dragged;
  }
  return noEmptyStrings({ v: 1, type: 'match', pairs });
}

/** Tile ids in blank order (first blank first). */
export function blanksAnswer(
  filledIds: ReadonlyArray<string> | null | undefined,
): AnswerV1 | null {
  const filled = idList(filledIds);
  return filled ? noEmptyStrings({ v: 1, type: 'blanks', filled }) : null;
}

/** Option id -> number of taps (non-negative whole numbers only). */
export function countsAnswer(
  counts: Record<string, number> | null | undefined,
): AnswerV1 | null {
  const entries = idKeyedEntries(counts);
  if (!entries) return null;
  const out: Record<string, number> = {};
  for (const [id, n] of entries) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return null;
    out[id] = n;
  }
  return noEmptyStrings({ v: 1, type: 'counts', counts: out });
}

/**
 * Option id -> typed text. Text is shortened to the limit. Entries that are
 * empty (or only whitespace) are left out: the server grades a missing entry
 * as empty, so the grade is the same. Nothing typed at all -> null.
 */
export function textAnswer(
  entries: Record<string, string | undefined> | null | undefined,
): AnswerV1 | null {
  const list = idKeyedEntries(entries);
  if (!list) return null;
  const out: Record<string, string> = {};
  for (const [id, value] of list) {
    const text = clampText(value);
    if (text.trim() === '') continue;
    out[id] = text;
  }
  if (Object.keys(out).length === 0) return null;
  return noEmptyStrings({ v: 1, type: 'text', entries: out });
}

/**
 * Option id -> typed numerator / denominator. If any part is empty (a
 * whole-number answer has no denominator, a static part may be missing) the
 * whole answer is null: no value is invented, and the server does not accept
 * empty strings.
 */
export function fractionAnswer(
  parts:
    | Record<
        string,
        { numerator?: string | null; denominator?: string | null } | undefined
      >
    | null
    | undefined,
): AnswerV1 | null {
  const list = idKeyedEntries(parts);
  if (!list) return null;
  const out: Record<string, { numerator: string; denominator: string }> = {};
  for (const [id, part] of list) {
    const numerator = clampText(part?.numerator);
    const denominator = clampText(part?.denominator);
    if (numerator.trim() === '' || denominator.trim() === '') return null;
    out[id] = { numerator, denominator };
  }
  return noEmptyStrings({ v: 1, type: 'fraction', parts: out });
}
