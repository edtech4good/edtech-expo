import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import { ClipSource, progressFraction } from './audio/audioManager';
import { COMPACT_AUDIO_SIZE, MIN_TOUCH, REGULAR_AUDIO_SIZE } from './compactTile';
import { useAudioClip } from './audio/useAudioClip';
import { PauseGlyph, PlayGlyph, WarnGlyph } from './glyphs';

export const OPTION_AUDIO_SIZE = REGULAR_AUDIO_SIZE;
const RING = 3; // width of the progress ring

export interface OptionAudioCircleProps {
  clipId: string;
  source: ClipSource | undefined;
  /** The option's text, so the button reads "Play audio for sale". */
  label?: string;
  /** Position inside a `renderAccessory` layer; ignored elsewhere. */
  placement?: 'inline' | 'bottom-right' | 'trailing-center';
  /**
   * 'compact': the 28pt circle for compact picture tiles (a phone on its
   * side), so it never covers the tile's result mark. The touch target is
   * still 44 x 44 on every platform: a transparent pressable with the disc
   * drawn inside it (hitSlop is not honoured on the web). With
   * placement 'bottom-right' the target fills the layer's bottom-right
   * corner. Default 'regular' (44pt).
   */
  size?: 'regular' | 'compact';
  /**
   * Compact only: how far the disc sits from the target's right and bottom
   * edges. Default: centred ((44 - 28) / 2 = 8).
   */
  discInset?: number;
  testID?: string;
}

/**
 * The per-option audio control: a 44pt outline circle with a play glyph;
 * while playing it is a filled blue disc with a pause glyph inside a
 * progress ring. Pressable on its own, so put it in ReorderableList's
 * `renderAccessory` (a sibling of the tile, never inside it):
 *
 *   renderAccessory={item => (
 *     <OptionAudioCircle clipId={item.id} source={src[item.id]} label={item.label}
 *       placement="trailing-center" />
 *   )}
 *
 * and leave room for it in the tile (`MovableTile reserveAudio`).
 * A missing clip renders nothing.
 */
export default function OptionAudioCircle({
  clipId,
  source,
  label,
  placement = 'inline',
  size: sizeName = 'regular',
  discInset = (MIN_TOUCH - COMPACT_AUDIO_SIZE) / 2,
  testID,
}: OptionAudioCircleProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { state, available, toggle } = useAudioClip(clipId, source);
  if (!available) return null;

  const loading = state.status === 'loading';
  const paused = state.status === 'paused';
  const playing = state.status === 'playing' || paused || loading;
  const failed = state.status === 'error';
  const progress = progressFraction(state);

  const compact = sizeName === 'compact';
  const size = compact ? COMPACT_AUDIO_SIZE : OPTION_AUDIO_SIZE;
  const ring = compact ? 2 : RING;
  const inner = size - ring * 2;
  const glyph = compact ? 11 : 14;
  const r = (size - ring) / 2;
  const circumference = 2 * Math.PI * r;
  // The touch target: the circle itself (regular), or 44 x 44 (compact).
  const target = compact ? MIN_TOUCH : size;
  const corner = compact ? 0 : 7;

  const place: ViewStyle | null =
    placement === 'bottom-right'
      ? { position: 'absolute', right: corner, bottom: corner }
      : placement === 'trailing-center'
        ? { position: 'absolute', right: 5, top: '50%', marginTop: -target / 2 }
        : null;

  // playing -> Pause, paused -> Resume, loading -> cancel, idle -> Play.
  const verb = loading ? 'loading' : paused ? 'resume' : playing ? 'pause' : 'play';
  const a11yLabel = failed
    ? t('kit.audio.unavailableRetry')
    : verb === 'loading'
      ? t('kit.audio.loadingA11y')
      : label
        ? t(`kit.audio.${verb}Option`, { label })
        : t(`kit.audio.${verb}OptionNoLabel`);

  const discStyle: ViewStyle[] = [
    styles.base,
    { width: size, height: size, borderRadius: size / 2 },
    ...(!playing
      ? [
          {
            borderWidth: 1.5,
            borderColor: failed ? theme.colors.error : theme.colors.primary,
            backgroundColor: theme.colors.surface,
          },
        ]
      : []),
  ];
  const content = (
    <>
      {playing ? (
        <>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={theme.colors.outline}
              strokeWidth={ring}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={theme.colors.primary}
              strokeWidth={ring}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference * progress} ${circumference}`}
              // Start at 12 o'clock.
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View
            style={[
              styles.inner,
              { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: theme.colors.primary },
            ]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : paused ? (
              <View style={{ marginLeft: 1.5 }}>
                <PlayGlyph color={theme.colors.onPrimary} size={glyph} />
              </View>
            ) : (
              <PauseGlyph color={theme.colors.onPrimary} size={glyph} />
            )}
          </View>
        </>
      ) : failed ? (
        <WarnGlyph color={theme.colors.error} size={compact ? 14 : 20} />
      ) : (
        <View style={{ marginLeft: compact ? 1.5 : 2 }}>
          <PlayGlyph color={theme.colors.primary} size={compact ? 12 : 16} />
        </View>
      )}
    </>
  );

  return (
    <Pressable
      testID={testID}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ busy: loading }}
      style={
        compact
          ? [{ width: target, height: target }, place]
          : [discStyle, place]
      }>
      {compact ? (
        <View
          pointerEvents="none"
          style={[discStyle, { position: 'absolute', right: discInset, bottom: discInset }]}>
          {content}
        </View>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
