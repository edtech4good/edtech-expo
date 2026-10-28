/**
 * Bilingual content: what a content row carries beyond its columns. The
 * student API adds `translations` (and the data boundary stamps
 * `contentlanguage`) when the app sends X-Content-Translations; the overlay
 * (transforms/Content) adds `textLanguage` and `textBase` to the rows it
 * returns. All optional: a row from an older server or cache has none.
 */
export interface ContentText {
  /** { "<language>": { "<field>": text, "<field>.<subkey>": text } }. */
  translations?: Record<string, Record<string, string>> | null;
  /** The language of the row's base text. */
  contentlanguage?: string | null;
  /** The language of each overlaid string, by field. */
  textLanguage?: Record<string, string>;
  /** The base text a translation replaced, by field. */
  textBase?: Record<string, string>;
}
