import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import { ClipSource, progressFraction } from './audio/audioManager';
import { useAudioClip } from './audio/useAudioClip';
import { PauseGlyph, PlayGlyph, WarnGlyph } from './glyphs';

export const OPTION_AUDIO_SIZE = 44;
const RING = 3; // width of the progress ring
const INNER = OPTION_AUDIO_SIZE - RING * 2; // 38

export interface OptionAudioCircleProps {
  clipId: string;
  source: ClipSource | undefined;
  /** The option's text, so the button reads "Play audio for sale". */
  label?: string;
  /** Position inside a `renderAccessory` layer; ignored elsewhere. */
  placement?: 'inline' | 'bottom-right' | 'trailing-center';
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
  testID,
}: OptionAudioCircleProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { state, available, toggle } = useAudioClip(clipId, source);
  if (!available) return null;

  const playing = state.status === 'playing' || state.status === 'loading';
  const failed = state.status === 'error';
  const progress = progressFraction(state);

  const r = (OPTION_AUDIO_SIZE - RING) / 2;
  const circumference = 2 * Math.PI * r;

  const place: ViewStyle | null =
    placement === 'bottom-right'
      ? { position: 'absolute', right: 7, bottom: 7 }
      : placement === 'trailing-center'
        ? { position: 'absolute', right: 5, top: '50%', marginTop: -OPTION_AUDIO_SIZE / 2 }
        : null;

  const a11yLabel = failed
    ? t('kit.audio.unavailableRetry')
    : label
      ? t(playing ? 'kit.audio.pauseOption' : 'kit.audio.playOption', { label })
      : t(playing ? 'kit.audio.pauseOptionNoLabel' : 'kit.audio.playOptionNoLabel');

  return (
    <Pressable
      testID={testID}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ busy: state.status === 'loading' }}
      style={[
        styles.base,
        place,
        !playing && {
          borderWidth: 1.5,
          borderColor: failed ? theme.colors.error : theme.colors.primary,
          backgroundColor: theme.colors.surface,
        },
      ]}>
      {playing ? (
        <>
          <Svg width={OPTION_AUDIO_SIZE} height={OPTION_AUDIO_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={OPTION_AUDIO_SIZE / 2}
              cy={OPTION_AUDIO_SIZE / 2}
              r={r}
              stroke={theme.colors.outline}
              strokeWidth={RING}
              fill="none"
            />
            <Circle
              cx={OPTION_AUDIO_SIZE / 2}
              cy={OPTION_AUDIO_SIZE / 2}
              r={r}
              stroke={theme.colors.primary}
              strokeWidth={RING}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference * progress} ${circumference}`}
              // Start at 12 o'clock.
              transform={`rotate(-90 ${OPTION_AUDIO_SIZE / 2} ${OPTION_AUDIO_SIZE / 2})`}
            />
          </Svg>
          <View style={[styles.inner, { backgroundColor: theme.colors.primary }]}>
            <PauseGlyph color={theme.colors.onPrimary} size={14} />
          </View>
        </>
      ) : failed ? (
        <WarnGlyph color={theme.colors.error} size={20} />
      ) : (
        <View style={{ marginLeft: 2 }}>
          <PlayGlyph color={theme.colors.primary} size={16} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: OPTION_AUDIO_SIZE,
    height: OPTION_AUDIO_SIZE,
    borderRadius: OPTION_AUDIO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
