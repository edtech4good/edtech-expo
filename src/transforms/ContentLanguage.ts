/**
 * Bilingual content, the data boundary. The student API sends
 * `contentlanguage` once, at the root of a content response, and
 * `translations` on every content row. The base text of a row is in that
 * language, but the row travels without the root (into the persisted lesson
 * cache, into a selection), so the language is written onto each row that
 * carries `translations` the moment the response arrives. Rows are kept raw
 * otherwise: nothing here changes a text.
 */

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Writes `body.contentlanguage` onto every object under `body.data` that has
 * a `translations` object. A body without a `contentlanguage` key (no header
 * sent, an older server, a token with no organisation) is left alone. A
 * `null` content language (the organisation has none) is written as `null`:
 * the row then reads as language "unknown".
 */
export function stampContentLanguage(body: unknown): void {
  if (!isObject(body) || !('contentlanguage' in body)) return;
  const raw = body.contentlanguage;
  const language = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (isObject(node)) {
      if (isObject(node.translations)) node.contentlanguage = language;
      Object.values(node).forEach(walk);
    }
  };
  walk(body.data);
}
