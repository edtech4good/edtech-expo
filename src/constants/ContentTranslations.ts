/**
 * Bilingual content (design note "Bilingual content: lesson text in the
 * learner's language", docs/bilingual-content-design.md in the workspace
 * repo, section 3 "Delivery to the app").
 *
 * The student API returns, when the request carries this header with the
 * value "1", `contentlanguage` at the root of a content response and
 * `translations` on every content row it lists. Without the header a
 * response is exactly what it was before translations existed, so an older
 * server simply ignores it.
 *
 * Sent by the student API client only, never the central one (central's CORS
 * list does not allow it). The web build also needs the server's CORS list to
 * name it, so the student API that knows this header is deployed first.
 */
export const CONTENT_TRANSLATIONS_HEADER = 'X-Content-Translations';

/** Only the exact value "1" turns translations on. */
export const CONTENT_TRANSLATIONS_HEADER_VALUE = '1';

/**
 * The fields of a question that an answer is graded by, per template id. The
 * student API never sends a translation of these and the app never overlays
 * one, even if a payload carried it (design note decision 8): template 21
 * compares what the learner types with the option text, and templates 8, 21
 * and 23 split `questiontext` on its blank markers. A mismatch between the app
 * and the server grader would mark a right answer wrong.
 * Mirrors ANSWER_BEARING_FIELDS in the student API's
 * src/constants/content-translations.ts.
 */
export const ANSWER_BEARING_FIELDS: Readonly<Record<number, readonly string[]>> = {
  8: ['questiontext'],
  21: ['questiontext', 'questionoptiontext'],
  23: ['questiontext'],
};

export function isAnswerBearingField(
  templatetypeid: unknown,
  field: string,
): boolean {
  const template =
    typeof templatetypeid === 'string' && templatetypeid.trim() !== ''
      ? Number(templatetypeid)
      : templatetypeid;
  return (
    typeof template === 'number' &&
    (ANSWER_BEARING_FIELDS[template] ?? []).includes(field)
  );
}
