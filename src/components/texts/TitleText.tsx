import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import BaseText, { BaseTextProps } from './BaseText';

export default function TitleText({
  color,
  children,
  disabled = false,
  fontWeight,
  alignSelf,
  textAlign,
  numberOfLines,
  onPress = undefined,
  fontFamily,
}: BaseTextProps) {
  const theme = useTheme();
  const textFontSize = useMemo(() => theme.fontSizes.title, []);
  const textLineHeight = useMemo(() => theme.lineHeights.title, []);
  const textFontWeight = useMemo(
    () => fontWeight || theme.fontWeights.title,
    [fontWeight],
  );

  return (
    <BaseText
      fontSize={textFontSize}
      color={color}
      disabled={disabled}
      fontWeight={textFontWeight}
      alignSelf={alignSelf}
      textAlign={textAlign}
      numberOfLines={numberOfLines}
      lineHeight={textLineHeight}
      fontFamily={fontFamily}
      onPress={onPress}>
      {children}
    </BaseText>
  );
}
