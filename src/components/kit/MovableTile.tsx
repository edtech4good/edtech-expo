import { GripGlyph } from '@/components/drag';
import OptionImage, { useOptionImageSlot } from '@/components/practices/OptionImage';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import { FLAT, LIFTED, RAISED } from './elevation';
import { useSmallText, useTileText } from './kitText';
import ResultMark from './ResultMark';
import { tileFrame, TileState } from './tileStyle';

/** Room a tile leaves for the 44pt option audio circle (44 + 4 gap). */
export const AUDIO_RESERVE = 48;

export interface MovableTileProps {
  state?: TileState;
  variant?: 'text' | 'image';
  /** The word, or the caption under a picture. Also the screen-reader name. */
  label: string;
  /** Image variant: the resolved URI from `useResource` ('' when missing). */
  imageSource?: string;
  imageHeight?: number;
  /** Image variant: a position badge on the picture (the number ordering keeps). */
  badge?: number;
  /**
   * True inside ReorderableList's `renderItem`. The list draws the frame,
   * the grip (text tiles) and the interaction, so this renders content only,
   * and nothing in it is interactive.
   */
  inList?: boolean;
  /** Leave room for the option audio circle (drawn as a `renderAccessory`). */
  reserveAudio?: boolean;
  /** Standalone only (a chip in a bank): makes the tile a button. */
  onPress?: () => void;
  testID?: string;
}

/**
 * The movable corporate tile: a raised white face, a 1.5px edge, a soft
 * shadow and a grip. See `tileFrame` for the seven states (default, picked,
 * dragging, placed, correct, incorrect, disabled) and `Slot` for the flat
 * places a tile lands in.
 *
 * Two variants: text (a word or phrase) and image (a picture with a caption;
 * a missing picture falls back to OptionImage's labelled tile).
 */
export default function MovableTile({
  state = 'default',
  variant = 'text',
  label,
  imageSource = '',
  imageHeight = 104,
  badge,
  inList = false,
  reserveAudio = false,
  onPress,
  testID,
}: MovableTileProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const text = useTileText();
  const small = useSmallText();
  const frame = tileFrame(theme.colors, state);
  const isImage = variant === 'image';
  const imageSlot = useOptionImageSlot(imageSource, label);

  const mark = frame.mark ? (
    <ResultMark kind={frame.mark} size={isImage ? 22 : 18} />
  ) : null;

  const textNode = (
    <Text
      style={{
        fontFamily: text.fontFamily,
        fontSize: text.fontSize,
        lineHeight: text.lineHeight,
        color: frame.textColor,
        flexShrink: 1,
      }}>
      {label}
    </Text>
  );

  let content: ReactNode;
  if (isImage) {
    content = (
      <View style={{ rowGap: 6 }}>
        <View>
          <OptionImage
            source={imageSource}
            label={label}
            slot={imageSlot}
            style={{ width: '100%', height: imageHeight, borderRadius: theme.radii.imageWell }}
            contentFit="cover"
          />
          {badge !== undefined ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    state === 'picked' || state === 'dragging' ? theme.colors.primary : theme.colors.surface,
                },
              ]}>
              <Text
                style={{
                  fontFamily: text.fontFamily,
                  fontSize: 13,
                  color:
                    state === 'picked' || state === 'dragging'
                      ? theme.colors.onPrimary
                      : state === 'correct'
                        ? theme.colors.successText
                        : state === 'incorrect'
                          ? theme.colors.error
                          : theme.colors.onSurface,
                }}>
                {badge}
              </Text>
            </View>
          ) : null}
          {frame.showGrip ? (
            <View style={[styles.gripBadge, { backgroundColor: theme.colors.surface }]}>
              <GripGlyph color={theme.colors.placeholder} />
            </View>
          ) : null}
          {mark ? <View style={styles.markCorner}>{mark}</View> : null}
        </View>
        {/* A missing picture already shows its label in the fallback tile, so the
            caption is not repeated; the row keeps its height for the audio circle. */}
        <Text
          style={{
            fontFamily: small.fontFamily,
            fontSize: small.fontSize,
            lineHeight: small.lineHeight,
            minHeight: 44,
            paddingLeft: 4,
            paddingRight: reserveAudio ? AUDIO_RESERVE : 4,
            color: theme.colors.onBackground,
          }}>
          {imageSlot.showPlaceholder ? '' : label}
        </Text>
      </View>
    );
  } else {
    content = (
      <View style={[styles.row, reserveAudio ? { paddingRight: AUDIO_RESERVE - 4 } : null]}>
        {!inList && frame.showGrip ? <GripGlyph color={state === 'picked' ? theme.colors.primary : theme.colors.placeholder} /> : null}
        {textNode}
        {mark}
      </View>
    );
  }

  if (inList) return <View testID={testID}>{content}</View>;

  const shell: ViewStyle = {
    backgroundColor: frame.backgroundColor,
    borderColor: frame.borderColor,
    borderWidth: frame.borderWidth,
    borderRadius: isImage ? theme.radii.card : 12,
    minHeight: isImage ? undefined : 48,
    minWidth: 48,
    justifyContent: 'center',
    ...(isImage
      ? { padding: frame.borderWidth === 2 ? 6.5 : 7 }
      : { paddingLeft: frame.paddingLeft, paddingRight: frame.paddingRight }),
    ...(frame.lifted ? LIFTED : frame.raised ? RAISED : FLAT),
  };

  // Announce the result in words: the disc and tint are never the only signal.
  // The sentence (label, full stop, result) is one key so Khmer can punctuate
  // its own way.
  const a11yLabel =
    frame.mark === 'correct'
      ? t('kit.mark.labelCorrect', { label })
      : frame.mark === 'incorrect'
        ? t('kit.mark.labelIncorrect', { label })
        : label;
  const inert = state === 'disabled' || frame.mark !== null;

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={inert}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected: state === 'picked', disabled: inert }}
        style={shell}>
        {content}
      </Pressable>
    );
  }
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityState={inert ? { disabled: true } : undefined}
      style={shell}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 7 },
  badge: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gripBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCorner: { position: 'absolute', top: 6, right: 6 },
});
