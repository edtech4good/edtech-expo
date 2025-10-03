import { fontFamilies, FontWeight, fontWeights } from '@/constants';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useMemo } from 'react';

export default function useFont(fontWeight?: FontWeight) {
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const fontFamily = useMemo(
    () => fontFamilies[selectedLanguage],
    [selectedLanguage],
  );
  const font = useMemo(
    () => `${fontFamily}${fontWeights[fontWeight ?? 'normal']}`,
    [fontFamily, fontWeight],
  );

  return font;
}
