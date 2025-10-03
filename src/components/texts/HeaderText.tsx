import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import BaseText, { BaseTextProps } from './BaseText';

export default function HeaderText({
  color,
  children,
  disabled = false,
  fontWeight,
  fontSize,
  alignSelf,
  textAlign,
  numberOfLines,
  fontFamily,
  onPress = undefined,
}: BaseTextProps) {
  const theme = useTheme();
  const textFontSize = useMemo(() => fontSize ?? theme.fontSizes.header, []);
  const textLineHeight = useMemo(() => theme.lineHeights.header, []);
  const textFontWeight = useMemo(
    () => fontWeight || theme.fontWeights.header,
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
