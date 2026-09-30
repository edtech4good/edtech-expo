import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

export interface ResultMarkProps {
  kind: 'correct' | 'incorrect';
  size?: number;
  /**
   * Announce the mark on its own ("Correct" / "Incorrect"). Off by default:
   * inside a tile the tile's label already says it, and the mark is colour
   * plus shape, so it never carries the result alone.
   */
  announce?: boolean;
  testID?: string;
}

/**
 * The ✓ and ✕ discs. ✓ is the mint success disc with the dark-green glyph
 * (`onSuccess` on `success`, 5.40:1); ✕ is the error disc with a white glyph
 * (`onPrimary` on `error`, 4.99:1).
 */
export default function ResultMark({ kind, size = 22, announce = false, testID }: ResultMarkProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const correct = kind === 'correct';
  return (
    <View
      testID={testID}
      accessible={announce}
      accessibilityLabel={announce ? t(correct ? 'kit.mark.correct' : 'kit.mark.incorrect') : undefined}
      accessibilityRole={announce ? 'image' : undefined}
      importantForAccessibility={announce ? 'yes' : 'no-hide-descendants'}
      aria-hidden={announce ? undefined : true}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={11} fill={correct ? colors.success : colors.error} />
        {correct ? (
          <Path
            d="M7 12.5l3.2 3.2L17 9"
            stroke={colors.onSuccess}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <Path
            d="M8.5 8.5l7 7M15.5 8.5l-7 7"
            stroke={colors.onPrimary}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        )}
      </Svg>
    </View>
  );
}
