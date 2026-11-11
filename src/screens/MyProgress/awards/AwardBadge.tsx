import { useFont } from '@/services';
import { Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

/**
 * PLACEHOLDER artwork: a hexagon carrying the module number, in the
 * programme's colour. Outlined and dashed when the award is not earned. It is
 * a picture only (the row or screen around it carries the meaning), so it is
 * hidden from assistive tech. Replace when real badge art exists.
 */
export function useBadgeColor(groupIndex: number): string {
  const theme = useTheme();
  const palette = [
    theme.colors.primary,
    theme.colors.cards[3].highlight,
    theme.colors.lessonChip,
    theme.colors.successText,
    theme.colors.secondary,
  ];
  return palette[Math.abs(groupIndex) % palette.length];
}

export default function AwardBadge({
  number,
  earned,
  color,
  size = 44,
}: {
  /** The level number; 0 shows no number. */
  number: number;
  earned: boolean;
  color: string;
  size?: number;
}) {
  const theme = useTheme();
  const font = useFont('bold', 'display');
  // Pointy-top hexagon in a 100 x 100 box.
  const points = '50,4 92,27 92,73 50,96 8,73 8,27';
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      aria-hidden
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {earned ? (
          <Polygon points={points} fill={color} />
        ) : (
          <Polygon
            points={points}
            fill="none"
            stroke={theme.colors.secondaryLight}
            strokeWidth={5}
            strokeDasharray="9,7"
          />
        )}
      </Svg>
      {number > 0 && (
        <Text
          style={{
            position: 'absolute',
            fontFamily: font,
            fontSize: size * 0.4,
            color: earned ? theme.colors.onPrimary : theme.colors.secondary,
          }}>
          {number}
        </Text>
      )}
    </View>
  );
}
