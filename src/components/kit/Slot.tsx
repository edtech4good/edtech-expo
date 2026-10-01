import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import { CrossGlyph } from './glyphs';
import { useSmallText, useTileText } from './kitText';
import ResultMark from './ResultMark';
import { slotFrame, SlotState } from './tileStyle';

export interface SlotProps {
  state?: SlotState;
  /** 'slot' fills its row (matching); 'blank' sits in a sentence (fill in the blank). */
  variant?: 'slot' | 'blank';
  /** What is in it when filled, correct or incorrect. */
  label?: string;
  /** Empty text; defaults to "Place an answer". Target state shows "Place here". */
  placeholder?: string;
  onPress?: () => void;
  /**
   * Draw the slot and nothing else: not focusable, not clickable and hidden
   * from screen readers, for a parent control that is already the one stop
   * (matching's Pressable names the slot and takes the touch).
   */
  decorative?: boolean;
  /** Show the small ✕ "take it back" cue on a filled slot. Defaults to `!!onPress`. */
  showTakeBack?: boolean;
  testID?: string;
}

/**
 * The flat place a movable tile lands: a dashed empty state, a filled state
 * (with a small ✕ cue: tapping takes the chip back), an active state for the
 * next blank to fill (blue, with a caret), and the result tints. Slots are
 * flat by design: only movable things are raised.
 */
export default function Slot({
  state = 'empty',
  variant = 'slot',
  label,
  placeholder,
  onPress,
  decorative = false,
  showTakeBack,
  testID,
}: SlotProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tile = useTileText();
  const small = useSmallText();
  const frame = slotFrame(theme.colors, state);
  // A drag hovering over a filled slot keeps showing what is in it.
  const hoverLabel = state === 'hover' && !!label;
  const hasContent =
    state === 'filled' || state === 'correct' || state === 'incorrect' || hoverLabel;
  const isBlank = variant === 'blank';
  // A graded slot is locked.
  const result = state === 'correct' || state === 'incorrect';

  let a11yLabel: string;
  if (hasContent) {
    // "Tap to take it back" only when the slot can be pressed.
    a11yLabel =
      state === 'filled' || state === 'hover'
        ? onPress
          ? t('kit.slot.a11yFilled', { label })
          : (label ?? '')
        : t(state === 'correct' ? 'kit.mark.labelCorrect' : 'kit.mark.labelIncorrect', { label });
  } else {
    a11yLabel = state === 'active' ? t('kit.slot.a11yActive') : t('kit.slot.a11yEmpty');
  }

  // Something can land here ("Place here"): picked (target) or dragged over (hover).
  const emptyText =
    state === 'target' || (state === 'hover' && !isBlank)
      ? t('kit.slot.target')
      : (placeholder ?? (isBlank ? '' : t('kit.slot.placeholder')));

  const body = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: frame.backgroundColor,
          borderColor: frame.borderColor,
          borderWidth: frame.borderWidth,
          borderStyle: frame.borderStyle,
          borderRadius: isBlank ? 10 : 12,
          minHeight: isBlank ? 44 : 48,
          minWidth: isBlank ? 96 : undefined,
          flex: isBlank ? undefined : 1,
          paddingHorizontal: isBlank ? 10 : 8,
        },
      ]}>
      {hasContent ? (
        <View style={styles.filled}>
          <Text
            style={{
              fontFamily: tile.fontFamily,
              fontSize: isBlank ? 16 : 15,
              lineHeight: tile.km ? 26 : 22,
              color: frame.textColor,
              flexShrink: 1,
            }}>
            {label}
          </Text>
          {state === 'filled' ? (
            (showTakeBack ?? !!onPress) ? (
              <View style={[styles.cue, { backgroundColor: theme.colors.surfaceVariant }]}>
                <CrossGlyph color={theme.colors.onSurfaceVariant} />
              </View>
            ) : null
          ) : state === 'hover' ? null : (
            <ResultMark kind={state === 'correct' ? 'correct' : 'incorrect'} size={18} />
          )}
        </View>
      ) : frame.caret ? (
        <View style={[styles.caret, { backgroundColor: theme.colors.primary }]} />
      ) : (
        <Text
          style={{
            fontFamily: small.fontFamily,
            fontSize: small.fontSize,
            lineHeight: small.lineHeight,
            color: frame.textColor,
            textAlign: 'center',
          }}>
          {emptyText}
        </Text>
      )}
    </View>
  );

  if (decorative) {
    return (
      <View
        testID={testID}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={isBlank ? undefined : styles.fill}>
        {body}
      </View>
    );
  }
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={result}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected: state === 'active', disabled: result }}
        style={isBlank ? undefined : styles.fill}>
        {body}
      </Pressable>
    );
  }
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityState={result ? { disabled: true } : undefined}
      style={isBlank ? undefined : styles.fill}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  base: { alignItems: 'center', justifyContent: 'center' },
  filled: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  cue: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: { width: 2, height: 20 },
});
