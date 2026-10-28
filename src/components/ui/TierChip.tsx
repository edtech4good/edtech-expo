import { useFont } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { typographyLanguage } from '@/i18n/typographyLanguage';
import { Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

export interface TierChipProps {
  /** The tier's name: content text, so it can be long (a 75-character Khmer programme name). */
  label: string;
  backgroundColor: string;
  color: string;
  /** The language of `label` when it is not the interface's (bilingual content). */
  textLanguage?: string;
}

/**
 * The small H24 pill on Level Detail that names a tier of the hierarchy (the
 * grey programme/grade chip, the blue level chip). Design v2 §3: chips H24,
 * 12px; v2.1: Khmer floor 13/20, and chips use min-height, never a fixed one.
 *
 * The label is content, so it can be longer than the row. It stays on one
 * line and ends in an ellipsis at the row's edge (`maxWidth: '100%'` plus a
 * shrinking Text) instead of running off the screen; the full name is the
 * chip's accessibility label, so a screen reader still gets all of it. The
 * handoff's "titles wrap, never truncate" is a rule for titles; a chip is a
 * label, and a multi-line pill would break the H24 shape.
 */
export default function TierChip({
  label,
  backgroundColor,
  color,
  textLanguage,
}: TierChipProps) {
  const theme = useTheme();
  const fontFamily = useFont('normal', 'body', textLanguage);
  const interfaceLanguage = useAppSelector(getSelectedLanguage);
  const isKhmer = typographyLanguage(textLanguage, interfaceLanguage) === 'km';

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        minHeight: 24,
        maxWidth: '100%',
        borderRadius: theme.radii.pill,
        backgroundColor,
        paddingHorizontal: 10,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          flexShrink: 1,
          maxWidth: '100%',
          fontFamily,
          // Khmer floor: never below 13px (v2.1 Khmer type scale).
          fontSize: isKhmer ? 13 : 12,
          lineHeight: isKhmer ? 20 : undefined,
          color,
        }}>
        {label}
      </Text>
    </View>
  );
}
