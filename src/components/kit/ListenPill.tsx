import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
  /**
   * The disc alone (32pt, in a transparent 44 x 44 target): the clamped question
   * card on a short screen after Submit. Same control and labels; a clip
   * that is playing keeps playing when it switches.
   */
  compact?: boolean;
  testID?: string;
}

/**
 * The question's "Listen" pill: 44pt high, a blue play disc and the word
 * "Listen"; while playing it fills blue and shows a pause glyph, level bars
 * and the elapsed time. A missing clip renders nothing; a clip that fails to
 * load shows "Audio unavailable" and a tap tries again.
 */
export default function ListenPill({ clipId, source, compact = false, testID }: ListenPillProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const small = useSmallText();
  const mono = useFont('normal', 'mono');
  const { state, available, toggle } = useAudioClip(clipId, source);
  if (!available) return null;

  const loading = state.status === 'loading';
  const paused = state.status === 'paused';
  // Filled blue whenever the clip is loaded or loading; the glyph says which.
  const playing = state.status === 'playing' || paused || loading;
  const failed = state.status === 'error';
  const fg = playing ? theme.colors.onPrimary : failed ? theme.colors.error : theme.colors.primary;
  const label = failed ? t('kit.audio.unavailable') : t('kit.audio.listen');
  const elapsed =
    state.durationMs > 0
      ? `${formatClock(state.positionMs)} / ${formatClock(state.durationMs)}`
      : formatClock(state.positionMs);

  const pillStyle = [
    styles.pill,
    compact ? styles.compactPill : null,
    {
      backgroundColor: playing ? theme.colors.primary : theme.colors.surface,
      borderColor: failed ? theme.colors.error : theme.colors.primary,
    },
  ];
  const children = (
    <>
      <View
        style={[
          styles.disc,
          compact ? styles.compactDisc : null,
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
        ) : loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : paused ? (
          <View style={{ marginLeft: 1.5 }}>
            <PlayGlyph color={theme.colors.primary} size={14} />
          </View>
        ) : playing ? (
          <PauseGlyph color={theme.colors.primary} size={14} />
        ) : (
          <View style={{ marginLeft: 1.5 }}>
            <PlayGlyph color={theme.colors.onPrimary} size={14} />
          </View>
        )}
      </View>
      {compact ? null : playing ? (
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
    </>
  );

  return (
    <Pressable
      testID={testID}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={
        failed
          ? t('kit.audio.unavailableRetry')
          : loading
            ? t('kit.audio.loadingA11y')
            : paused
              ? t('kit.audio.resumeA11y')
              : playing
                ? t('kit.audio.pauseA11y')
                : t('kit.audio.listenA11y')
      }
      accessibilityState={{ busy: loading }}
      // Compact: a transparent 44 x 44 target around the 32pt disc (hitSlop
      // is not honoured on the web). The -6 margins keep its layout at 32,
      // so the clamped card stays as short as before.
      style={compact ? styles.compactTarget : pillStyle}>
      {compact ? <View style={pillStyle}>{children}</View> : children}
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
  compactTarget: {
    width: 44,
    height: 44,
    margin: -6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  compactPill: {
    height: 32,
    width: 32,
    paddingLeft: 0,
    paddingRight: 0,
    justifyContent: 'center',
  },
  compactDisc: { width: 25, height: 25, borderRadius: 12.5 },
  disc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
