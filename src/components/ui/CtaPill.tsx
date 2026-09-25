import { useFont } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { ChevronIcon } from './StatusIcon';

export interface CtaPillProps {
  label: string;
  /**
   * 'filled' (default): solid primary pill + chevron, unchanged for existing
   * callers (e.g. the Level Detail up-next row's own inline pill markup).
   * 'tint': primaryLight background, primaryDark text, no chevron, matching
   * LessonRow's up-next pill — used by LessonStepRow's next-step pill.
   */
  variant?: 'filled' | 'tint';
  testID?: string;
}

/**
 * Small "Start ›" / "Continue ›" pill used on the up-next lesson/activity
 * row. Replaces the old blue play-disc — a chevron, not a play triangle, so
 * it doesn't read as "watch a video." Non-interactive on its own; it lives
 * inside a row whose whole surface is already the Pressable target.
 */
export default function CtaPill({
  label,
  variant = 'filled',
  testID = 'cta-pill',
}: CtaPillProps) {
  const theme = useTheme();
  const labelFontFamily = useFont('semi', 'body');
  const isTint = variant === 'tint';
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  // Khmer floor: never below 13px.
  const fontSize = isKhmer ? 13 : 12;
  const lineHeight = isKhmer ? 20 : undefined;

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        justifyContent: 'center',
        gap: 2,
        minHeight: isTint ? 28 : undefined,
        borderRadius: theme.radii.pill,
        backgroundColor: isTint ? theme.colors.primaryLight : theme.colors.primary,
        paddingHorizontal: isTint ? 12 : 10,
        paddingVertical: isTint ? 3 : 4,
      }}>
      <Text
        style={{
          fontFamily: labelFontFamily,
          fontSize,
          lineHeight,
          color: isTint ? theme.colors.primaryDark : theme.colors.onPrimary,
        }}>
        {label}
      </Text>
      {!isTint && <ChevronIcon size={14} color={theme.colors.onPrimary} />}
    </View>
  );
}
