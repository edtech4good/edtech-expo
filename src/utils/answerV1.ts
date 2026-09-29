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
  return selected ? { v: 1, type: 'choice', selected } : null;
}

/** Option ids in the order the learner placed them. */
export function orderAnswer(
  orderedIds: ReadonlyArray<string> | null | undefined,
): AnswerV1 | null {
  const order = idList(orderedIds);
  return order ? { v: 1, type: 'order', order } : null;
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
  return { v: 1, type: 'match', pairs };
}

/** Tile ids in blank order (first blank first). */
export function blanksAnswer(
  filledIds: ReadonlyArray<string> | null | undefined,
): AnswerV1 | null {
  const filled = idList(filledIds);
  return filled ? { v: 1, type: 'blanks', filled } : null;
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
  return { v: 1, type: 'counts', counts: out };
}

/** Option id -> typed text. Text is shortened to the limit, never dropped. */
export function textAnswer(
  entries: Record<string, string | undefined> | null | undefined,
): AnswerV1 | null {
  const list = idKeyedEntries(entries);
  if (!list) return null;
  const out: Record<string, string> = {};
  for (const [id, value] of list) out[id] = clampText(value);
  return { v: 1, type: 'text', entries: out };
}

/** Option id -> typed numerator / denominator. Missing parts become ''. */
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
    out[id] = {
      numerator: clampText(part?.numerator),
      denominator: clampText(part?.denominator),
    };
  }
  return { v: 1, type: 'fraction', parts: out };
}
