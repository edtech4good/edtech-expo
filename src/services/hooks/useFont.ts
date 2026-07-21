import { familyWeights, FontRole, FontWeight } from '@/constants';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

export default function useFont(
  fontWeight?: FontWeight,
  role: FontRole = 'body',
) {
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const theme = useTheme();

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
