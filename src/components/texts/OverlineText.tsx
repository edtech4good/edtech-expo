import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import BaseText, { BaseTextProps } from './BaseText';

export default function OverlineText({
  color,
  children,
  disabled = false,
  fontWeight,
  alignSelf,
  textAlign,
  numberOfLines,
  onPress = undefined,
}: BaseTextProps) {
  const theme = useTheme();
  const textFontSize = useMemo(() => theme.fontSizes.overline, []);
  const textLineHeight = useMemo(() => theme.lineHeights.overline, []);
  const textFontWeight = useMemo(
    () => fontWeight || theme.fontWeights.overline,
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
      onPress={undefined}>
      {children}
    </BaseText>
  );
}
