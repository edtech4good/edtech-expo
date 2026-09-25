import { useFont } from '@/services';
import { Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { ChevronIcon } from './StatusIcon';

export interface CtaPillProps {
  label: string;
  testID?: string;
}

/**
 * Small "Start ›" / "Continue ›" pill used on the up-next lesson/activity
 * row. Replaces the old blue play-disc — a chevron, not a play triangle, so
 * it doesn't read as "watch a video." Non-interactive on its own; it lives
 * inside a row whose whole surface is already the Pressable target.
 */
export default function CtaPill({ label, testID = 'cta-pill' }: CtaPillProps) {
  const theme = useTheme();
  const labelFontFamily = useFont('semi', 'body');

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 2,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}>
      <Text
        style={{
          fontFamily: labelFontFamily,
          fontSize: 12,
          color: theme.colors.onPrimary,
        }}>
        {label}
      </Text>
      <ChevronIcon size={14} color={theme.colors.onPrimary} />
    </View>
  );
}
