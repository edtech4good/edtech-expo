import { FontWeight } from '@/constants';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useFont } from '@/services';
import { Text, TextProps } from 'react-native';
import { useTheme } from 'styled-components/native';

export interface EyebrowTextProps extends TextProps {
  children: string;
  size?: number;
  color?: string;
  weight?: FontWeight;
}

/**
 * Mono uppercase micro-label (e.g. "LEARNING", "STEP 2 OF 4").
 *
 * All languages are floored at the caption token per the handoff's 12 pt
 * floor (audit U-19). Khmer additionally renders 2px larger because its
 * glyphs sit low in the em box; its script shaping (base + combining marks)
 * also breaks under `textTransform: uppercase` and non-zero letter spacing,
 * so Khmer deliberately skips both.
 */
export default function EyebrowText({
  children,
  size,
  color,
  weight = 'normal',
  style,
  ...rest
}: EyebrowTextProps) {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const fontFamily = useFont(weight, 'mono');
  const isKhmer = selectedLanguage === 'km';

  const resolvedColor = color ?? theme.colors.onSurfaceVariant;
  const resolvedSize = size ?? theme.fontSizes.eyebrow;
  const fontSize = Math.max(
    theme.fontSizes.caption,
    isKhmer ? resolvedSize + 2 : resolvedSize,
  );

  return (
    <Text
      accessibilityRole="text"
      style={[
        {
          fontFamily,
          fontSize,
          color: resolvedColor,
          letterSpacing: isKhmer ? 0 : fontSize * 0.16,
          textTransform: isKhmer ? 'none' : 'uppercase',
        },
        style,
      ]}
      {...rest}>
      {children}
    </Text>
  );
}
