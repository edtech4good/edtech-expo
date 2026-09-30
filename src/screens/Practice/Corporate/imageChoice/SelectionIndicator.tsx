import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

export interface SelectionIndicatorProps {
  /** A radio (single answer) or a checkbox (several). */
  kind: 'radio' | 'checkbox';
  /** The learner's own selection, and nothing else. */
  checked: boolean;
  size?: number;
}

/**
 * The selection control on a picture card. A radio is a ring that fills to a
 * teal dot; a checkbox is a rounded square that fills teal with a tick, so
 * the two never look alike. Decoration: the card carries the role and state.
 */
export default function SelectionIndicator({ kind, checked, size = 22 }: SelectionIndicatorProps) {
  const { colors } = useTheme();
  if (kind === 'radio') {
    return (
      <View
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: checked ? size * 0.27 : 1.5,
          borderColor: checked ? colors.selection : colors.outline,
          backgroundColor: colors.surface,
        }}
      />
    );
  }
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        borderWidth: checked ? 0 : 1.5,
        borderColor: colors.outline,
        backgroundColor: checked ? colors.selection : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {checked ? (
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12.5l4.2 4.2L19 7"
            stroke={colors.onPrimary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}
