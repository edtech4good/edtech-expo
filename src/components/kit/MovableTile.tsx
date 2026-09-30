import { GripGlyph } from '@/components/drag';
import OptionImage, { useOptionImageSlot } from '@/components/practices/OptionImage';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import hexAlpha from '@/utils/hexAlpha';
import {
  COMPACT_AUDIO_RESERVE,
  compactCaptionShown,
  ORDERING_COMPACT_MARK,
} from './compactTile';
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
  /**
   * Image variant on a short screen (a phone on its side): no caption row.
   * The caption sits on the picture (dropped on a tiny picture, see
   * compactTile.ts), the badges and the mark are smaller, and the audio
   * circle is the compact one. The tile is the picture plus its frame.
   */
  compact?: boolean;
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
  compact = false,
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

  const compactImage = isImage && compact;
  const mark = frame.mark ? (
    <ResultMark
      testID={testID ? `${testID}-mark` : undefined}
      kind={frame.mark}
      size={compactImage ? ORDERING_COMPACT_MARK.size : isImage ? 22 : 18}
    />
  ) : null;
  const picked = state === 'picked' || state === 'dragging';
  const badgeSize = compactImage ? 24 : 28;
  const gripSize = compactImage ? 26 : 32;
  const showCompactCaption =
    compactImage && !imageSlot.showPlaceholder && label !== '' && compactCaptionShown(imageHeight);

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
      <View style={compactImage ? null : { rowGap: 6 }}>
        <View>
          <OptionImage
            source={imageSource}
            label={label}
            slot={imageSlot}
            style={{ width: '100%', height: imageHeight, borderRadius: theme.radii.imageWell }}
            contentFit="cover"
          />
          {showCompactCaption ? (
            // The caption on the picture: one line on a light band, clear of
            // the audio circle in the bottom-right corner.
            <View
              style={[
                styles.captionBand,
                {
                  backgroundColor: hexAlpha(theme.colors.surface, 0.92),
                  borderBottomLeftRadius: theme.radii.imageWell,
                  borderBottomRightRadius: theme.radii.imageWell,
                  paddingRight: reserveAudio ? COMPACT_AUDIO_RESERVE : 6,
                },
              ]}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: small.fontFamily,
                  fontSize: 12,
                  lineHeight: small.km ? 20 : 16,
                  color: theme.colors.onBackground,
                }}>
                {label}
              </Text>
            </View>
          ) : null}
          {badge !== undefined ? (
            <View
              style={[
                styles.badge,
                compactImage
                  ? { top: 4, left: 4, width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }
                  : null,
                {
                  backgroundColor: picked ? theme.colors.primary : theme.colors.surface,
                },
              ]}>
              <Text
                style={{
                  fontFamily: text.fontFamily,
                  fontSize: compactImage ? 12 : 13,
                  color:
                    picked
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
            <View
              style={[
                styles.gripBadge,
                compactImage ? { width: gripSize, height: gripSize, borderRadius: 8 } : null,
                { backgroundColor: theme.colors.surface },
              ]}>
              <GripGlyph color={theme.colors.placeholder} />
            </View>
          ) : null}
          {mark ? (
            <View
              style={
                compactImage
                  ? {
                      position: 'absolute',
                      top: ORDERING_COMPACT_MARK.vertical,
                      right: ORDERING_COMPACT_MARK.right,
                    }
                  : styles.markCorner
              }>
              {mark}
            </View>
          ) : null}
        </View>
        {/* A missing picture already shows its label in the fallback tile, so the
            caption is not repeated; the row keeps its height for the audio circle.
            Compact: no caption row (the caption is on the picture). */}
        {compactImage ? null : (
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
        )}
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
  captionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: 6,
    paddingVertical: 2,
  },
});
