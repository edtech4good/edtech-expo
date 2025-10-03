import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import BaseText, { BaseTextProps } from './BaseText';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { fontFamilies, FontFamily, fontWeights } from '@/constants';

export default function ButtonText({
  alignSelf,
  color,
  children,
  disabled = false,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  numberOfLines,
  style,
  textAlign,
  onPress = undefined,
}: BaseTextProps) {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const textFontSize = useMemo(
    () => fontSize || theme.fontSizes.button,
    [fontSize],
  );
  const textLineHeight = useMemo(
    () => lineHeight || theme.lineHeights.button,
    [lineHeight],
  );
  const textFontFamily = useMemo(
    () =>
      fontFamily ||
      `${fontFamilies[selectedLanguage]}${
        fontWeights[fontWeight || theme.fontWeights.button]
      }`,
    [selectedLanguage, fontWeight, fontFamily],
  );

  return (
    <BaseText
      fontSize={textFontSize}
      color={color}
      disabled={disabled}
      alignSelf={alignSelf}
      textAlign={textAlign}
      numberOfLines={numberOfLines}
      lineHeight={textLineHeight}
      fontFamily={textFontFamily as FontFamily}
      style={style}
      onPress={onPress}>
      {children}
    </BaseText>
  );
}
