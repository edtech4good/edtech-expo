import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import { useFont } from '@/services';
import { ClipSource, formatClock } from './audio/audioManager';
import { useAudioClip } from './audio/useAudioClip';
import { LevelBars, PauseGlyph, PlayGlyph, WarnGlyph } from './glyphs';
import { useSmallText } from './kitText';

export interface ListenPillProps {
  /** Unique per clip, e.g. `q-${questionid}`. */
  clipId: string;
  /** Resolved by `useResource` (a URI), or a bundled asset. '' hides the pill. */
  source: ClipSource | undefined;
  testID?: string;
}

/**
 * The question's "Listen" pill: 44pt high, a blue play disc and the word
 * "Listen"; while playing it fills blue and shows a pause glyph, level bars
 * and the elapsed time. A missing clip renders nothing; a clip that fails to
 * load shows "Audio unavailable" and a tap tries again.
 */
export default function ListenPill({ clipId, source, testID }: ListenPillProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const small = useSmallText();
  const mono = useFont('normal', 'mono');
  const { state, available, toggle } = useAudioClip(clipId, source);
  if (!available) return null;

  const playing = state.status === 'playing' || state.status === 'loading';
  const failed = state.status === 'error';
  const fg = playing ? theme.colors.onPrimary : failed ? theme.colors.error : theme.colors.primary;
  const label = failed ? t('kit.audio.unavailable') : t('kit.audio.listen');
  const elapsed =
    state.durationMs > 0
      ? `${formatClock(state.positionMs)} / ${formatClock(state.durationMs)}`
      : formatClock(state.positionMs);

  return (
    <Pressable
      testID={testID}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={
        failed
          ? t('kit.audio.unavailableRetry')
          : playing
            ? t('kit.audio.pauseA11y')
            : t('kit.audio.listenA11y')
      }
      accessibilityState={{ busy: state.status === 'loading' }}
      style={[
        styles.pill,
        {
          backgroundColor: playing ? theme.colors.primary : theme.colors.surface,
          borderColor: failed ? theme.colors.error : theme.colors.primary,
        },
      ]}>
      <View
        style={[
          styles.disc,
          {
            backgroundColor: playing
              ? theme.colors.surface
              : failed
                ? theme.colors.surface
                : theme.colors.primary,
          },
        ]}>
        {failed ? (
          <WarnGlyph color={theme.colors.error} size={18} />
        ) : playing ? (
          <PauseGlyph color={theme.colors.primary} size={14} />
        ) : (
          <View style={{ marginLeft: 1.5 }}>
            <PlayGlyph color={theme.colors.onPrimary} size={14} />
          </View>
        )}
      </View>
      {playing ? (
        <>
          <LevelBars color={fg} />
          <Text style={{ fontFamily: mono, fontSize: 12, color: fg }}>{elapsed}</Text>
        </>
      ) : (
        <Text
          style={{
            fontFamily: small.fontFamily,
            fontSize: 14,
            lineHeight: small.km ? 24 : 20,
            color: fg,
          }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    paddingLeft: 5,
    paddingRight: 18,
    alignSelf: 'center',
  },
  disc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
