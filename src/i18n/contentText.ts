/**
 * Bilingual content: which text a learner sees for one field of a content
 * row (design note "Bilingual content", section 3 "Delivery to the app").
 *
 * The existing columns hold the text in the organisation's base language. The
 * student API adds `translations` to each row,
 *
 *   { "<language>": { "<field>": text, "<field>.<subkey>": text } }
 *
 * where the subkey is an option id (questionoptiontext, questionassociatetext),
 * a distractor id (questiondistractortext) or a message key (feedback). It
 * sends only translations that are current, and the language of the base text
 * once per response as `contentlanguage`, which the data boundary writes onto
 * the row (transforms/ContentLanguage).
 *
 * Pure: no store, no React. The selected interface language is a parameter.
 */

/** Stands in for the language of a base text when the server named none. */
export const UNKNOWN_CONTENT_LANGUAGE = 'unknown';

/** What a screen renders, and the language that text is in (for its typography). */
export interface ContentText {
  text: string;
  language: string;
}

/** The part of a content row the overlay reads. */
export interface TranslatableRow {
  translations?: Record<string, Record<string, string> | null | undefined> | null;
  contentlanguage?: string | null;
  [field: string]: unknown;
}

/** The key a translation is stored under: `field`, or `field.subkey`. */
export const translationKey = (field: string, subkey?: string | null): string =>
  subkey ? `${field}.${subkey}` : field;

/** A language code as the API keys it: primary subtag, lower case (`KM` and `km-KH` are `km`). */
export const normaliseLanguage = (code: unknown): string => {
  if (typeof code !== 'string') return '';
  const trimmed = code.trim();
  if (trimmed === '') return '';
  const dash = trimmed.indexOf('-');
  return (dash === -1 ? trimmed : trimmed.slice(0, dash)).toLowerCase();
};

/** The language of a row's base text: its stamped `contentlanguage`, else "unknown". */
export const baseLanguageOf = (row: { contentlanguage?: unknown } | null | undefined): string =>
  normaliseLanguage(row?.contentlanguage) || UNKNOWN_CONTENT_LANGUAGE;

const hasText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/**
 * The text for `base` given the translations of its row. The translation for
 * `language` wins when it has text; otherwise the base text, in the row's
 * content language. A blank or missing translation never blanks a field that
 * has base text.
 */
export function resolveText(
  base: unknown,
  translations: TranslatableRow['translations'],
  key: string,
  language: string,
  contentlanguage: unknown,
): ContentText {
  const wanted = normaliseLanguage(language);
  const translated = wanted ? translations?.[wanted]?.[key] : undefined;
  const baseText = typeof base === 'string' ? base : '';
  if (hasText(translated)) return { text: translated, language: wanted };
  return { text: baseText, language: baseLanguageOf({ contentlanguage }) };
}

/**
 * `row[field]` shown to a learner whose interface is in `language`: the
 * translation of that field (and subkey) if the row has a current one, else
 * the base text with the row's content language.
 *
 * `row[field]` is read as the base text. For a nested value (an option's
 * text, a distractor's) pass the nested object's value through
 * `resolveText` with the question's translations instead.
 */
export function textOf(
  row: TranslatableRow | null | undefined,
  field: string,
  subkey: string | undefined,
  language: string,
): ContentText {
  return resolveText(row?.[field], row?.translations, translationKey(field, subkey), language, row?.contentlanguage);
}

/**
 * Whether a search `query` finds `row[field]`: it matches the text the
 * learner sees (the overlay's `row[field]`) and the base text it replaced
 * (`row.textBase[field]`), case-insensitively, so a learner can search a
 * curriculum by the name the author gave it as well as by the name shown.
 */
export function matchesContentText<T extends object>(
  row: T | null | undefined,
  field: string,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  const value = (row as Record<string, unknown> | null | undefined)?.[field];
  const shown = typeof value === 'string' ? value : '';
  const base = (row as { textBase?: Record<string, string> | null } | null | undefined)?.textBase?.[field] ?? '';
  return shown.toLowerCase().includes(needle) || base.toLowerCase().includes(needle);
}
