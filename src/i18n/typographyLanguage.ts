/**
 * The language whose typography (font family, line height) a text is set in:
 * the language of the text when it is one the app has a type scale for
 * ('km' or 'en'), else the interface language. Interface strings pass no text
 * language; a content string whose language the server did not name ('unknown'),
 * or names in a language the app has no font for, keeps the interface's.
 */
export type TypographyLanguage = 'en' | 'km';

export function typographyLanguage(
  textLanguage: string | null | undefined,
  interfaceLanguage: string | null | undefined,
): TypographyLanguage {
  if (textLanguage === 'km' || textLanguage === 'en') return textLanguage;
  return interfaceLanguage === 'en' ? 'en' : 'km';
}
