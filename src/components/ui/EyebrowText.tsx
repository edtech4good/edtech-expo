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
  /** Skip the 12px English floor — only for labels the handoff sets below it (step dots at 8px). Khmer keeps its own floor. */
  floor?: boolean;
}

/**
 * Mono uppercase micro-label (e.g. "LEARNING", "STEP 2 OF 4").
 *
 * English is floored at the caption token per the handoff's 12 pt floor
 * (audit U-19); pass `floor={false}` to opt out (for step-dot labels at 8px).
 * Its family (SpaceMono) is unaffected by the `weight` prop's default —
 * `weight` stays 'normal' unless a caller explicitly asks for something
 * else, since SpaceMono has no separate SemiBold face (`semi` maps to
 * Bold — see familyWeights).
 *
 * Khmer instead follows a fixed rule (v2.1 Khmer eyebrow spec): Noto Sans
 * Khmer, weight 600 (SemiBold) at a flat 13px, no letter-spacing, no
 * uppercase transform — its script shaping (base + combining marks) breaks
 * under both, and its glyphs sit low in the em box so it needs its own
 * fixed size rather than the English floor/scale logic.
 */
export default function EyebrowText({
  children,
  size,
  color,
  weight = 'normal',
  floor = true,
  style,
  ...rest
}: EyebrowTextProps) {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const isKhmer = selectedLanguage === 'km';
  const fontFamily = useFont(isKhmer ? 'semi' : weight, 'mono');

  const resolvedColor = color ?? theme.colors.onSurfaceVariant;
  const resolvedSize = size ?? theme.fontSizes.eyebrow;
  const fontSize = isKhmer
    ? 13
    : floor
    ? Math.max(theme.fontSizes.caption, resolvedSize)
    : resolvedSize;
  // Khmer eyebrow spec (v2.1): flat 13/20 line height (>=1.5x fontSize).
  // English keeps its natural (undefined) line height.
  const lineHeight = isKhmer ? 20 : undefined;

  return (
    <Text
      accessibilityRole="text"
      style={[
        {
          fontFamily,
          fontSize,
          lineHeight,
          color: resolvedColor,
          letterSpacing: isKhmer ? 0 : fontSize * 0.1,
          textTransform: isKhmer ? 'none' : 'uppercase',
        },
        style,
      ]}
      {...rest}>
      {children}
    </Text>
  );
}
