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
 * Khmer has no letter case, and its script shaping (base + combining
 * marks) breaks under both `textTransform: uppercase` and non-zero letter
 * spacing/tracking — so Khmer content deliberately skips both and renders
 * a touch larger to stay legible at micro-label sizes.
 */
export default function EyebrowText({
  children,
  size = 10,
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
  const fontSize = isKhmer ? Math.max(12, size + 2) : size;

  return (
    <Text
      accessibilityRole="text"
      style={[
        {
          fontFamily,
          fontSize,
          color: resolvedColor,
          letterSpacing: isKhmer ? 0 : size * 0.16,
          textTransform: isKhmer ? 'none' : 'uppercase',
        },
        style,
      ]}
      {...rest}>
      {children}
    </Text>
  );
}
