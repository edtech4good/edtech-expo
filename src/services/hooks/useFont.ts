import { familyWeights, FontRole, FontWeight } from '@/constants';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';
import { typographyLanguage } from '@/i18n/typographyLanguage';

/**
 * The font family (with weight) for a text. `textLanguage` is the language of
 * the TEXT when it is not the interface's own (bilingual content: a Khmer
 * title in an English interface, an English title in a Khmer one); leave it
 * out for interface strings and the interface language decides.
 */
export default function useFont(
  fontWeight?: FontWeight,
  role: FontRole = 'body',
  textLanguage?: string | null,
) {
  const interfaceLanguage = useAppSelector(getSelectedLanguage);
  const theme = useTheme();
  const selectedLanguage = typographyLanguage(textLanguage, interfaceLanguage);

  const fontFamily = useMemo(
    () => theme.fonts[selectedLanguage][role],
    [theme, selectedLanguage, role],
  );

  const font = useMemo(() => {
    const weights =
      familyWeights[fontFamily as keyof typeof familyWeights];
    return `${fontFamily}${weights[fontWeight ?? 'normal']}`;
  }, [fontFamily, fontWeight]);

  return font;
}

/**
 * The same font as useFont for a text whose language is only known per item
 * (a list of content strings): returns a function from the text's language to
 * the font family, so a loop can pick without calling a hook per item.
 */
export function useFontForText(
  fontWeight?: FontWeight,
  role: FontRole = 'body',
): (textLanguage?: string | null) => string {
  const interfaceLanguage = useAppSelector(getSelectedLanguage);
  const theme = useTheme();
  return useMemo(
    () => (textLanguage?: string | null) => {
      const fontFamily =
        theme.fonts[typographyLanguage(textLanguage, interfaceLanguage)][role];
      const weights = familyWeights[fontFamily as keyof typeof familyWeights];
      return `${fontFamily}${weights[fontWeight ?? 'normal']}`;
    },
    [theme, interfaceLanguage, role, fontWeight],
  );
}
