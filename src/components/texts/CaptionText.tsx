import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import BaseText, { BaseTextProps } from './BaseText';

export default function CaptionText({
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
  const textFontSize = useMemo(() => theme.fontSizes.caption, []);
  const textLineHeight = useMemo(() => theme.lineHeights.caption, []);
  const textFontWeight = useMemo(
    () => fontWeight || theme.fontWeights.caption,
    [fontWeight],
  );

  return (
    <BaseText
      fontSize={textFontSize}
      color={color}
      disabled={disabled}
      fontWeight={textFontWeight}
      alignSelf={alignSelf}
      lineHeight={textLineHeight}
      textAlign={textAlign}
      numberOfLines={numberOfLines}
      onPress={onPress}>
      {children}
    </BaseText>
  );
}
