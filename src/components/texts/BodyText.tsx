import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import BaseText, { BaseTextProps } from './BaseText';

export default function BodyText({
  color,
  children,
  disabled = false,
  fontWeight,
  alignSelf,
  textAlign,
  numberOfLines,
  fontFamily,
  style,
  onPress = undefined,
}: BaseTextProps) {
  const theme = useTheme();
  const textFontSize = useMemo(() => theme.fontSizes.body, []);
  const textLineHeight = useMemo(() => theme.lineHeights.body, []);
  const textFontWeight = useMemo(
    () => fontWeight || theme.fontWeights.body,
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
      style={style}
      onPress={onPress}>
      {children}
    </BaseText>
  );
}
