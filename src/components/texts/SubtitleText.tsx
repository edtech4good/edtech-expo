import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import BaseText, { BaseTextProps } from './BaseText';

export default function SubtitleText({
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
  const textFontSize = useMemo(() => theme.fontSizes.subtitle, []);
  const textLineHeight = useMemo(() => theme.lineHeights.subtitle, []);
  const textFontWeight = useMemo(
    () => fontWeight || theme.fontWeights.subtitle,
    [fontWeight],
  );

  return (
    <BaseText
      fontSize={textFontSize}
      color={color}
      fontWeight={textFontWeight}
      alignSelf={alignSelf}
      textAlign={textAlign}
      numberOfLines={numberOfLines}
      lineHeight={textLineHeight}
      disabled={disabled}
      onPress={onPress}>
      {children}
    </BaseText>
  );
}
