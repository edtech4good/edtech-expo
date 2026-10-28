import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useFont } from '@/services';
import { typographyLanguage } from '@/i18n/typographyLanguage';

/**
 * Font and leading for tile and chip text: 17/22 Latin, 17/30 Khmer (design v2.1 Khmer scale).
 * `textLanguage` is the language of a content text that is not the interface's
 * own (bilingual content); leave it out for interface strings.
 */
export function useTileText(textLanguage?: string | null) {
  const language = useAppSelector(getSelectedLanguage);
  const fontFamily = useFont('semi', 'body', textLanguage);
  const km = typographyLanguage(textLanguage, language) === 'km';
  return { fontFamily, fontSize: 17, lineHeight: km ? 30 : 22, km } as const;
}

/** 13/17 Latin, 13/22 Khmer, for captions and slot placeholders. */
export function useSmallText(textLanguage?: string | null) {
  const language = useAppSelector(getSelectedLanguage);
  const fontFamily = useFont('semi', 'body', textLanguage);
  const km = typographyLanguage(textLanguage, language) === 'km';
  return { fontFamily, fontSize: 13, lineHeight: km ? 22 : 17, km } as const;
}
