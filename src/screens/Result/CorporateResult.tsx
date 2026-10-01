import { AppButton, EyebrowText } from '@/components';
import { QuestionColumn } from '@/components/kit';
import { useFont, useTypeRole } from '@/services';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import { ResultBand } from './resultBand';
import ResultIllustration from './ResultIllustration';
import { ResultVariant } from './resultVariant';
import useReducedMotion from './useReducedMotion';

export interface CorporateResultProps {
  band: ResultBand;
  variant: ResultVariant;
  score: number;
  maxScore: number;
  percentage: number;
  metaLine: string;
  onFinish: () => void;
}

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const RING_MS = 900;
const BURST_DELAY_MS = 450;
const BURST_MS = 600;
/** On wide screens the Finish pill stops at this width, centred. */
const FINISH_MAX_WIDTH = 360;
/** Phones turned sideways are too short for the stacked layout. */
const COMPACT_HEIGHT = 500;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ---------------------------------------------------------------- ring
function ScoreRing({
  percentage,
  size,
  arc,
  fill,
  reduced,
  label,
}: {
  percentage: number;
  size: number;
  arc: string;
  fill: string;
  reduced: boolean | null;
  label: string;
}) {
  const theme = useTheme();
  const fontFamily = useFont('bold', 'display');
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.min(1, Math.max(0, percentage / 100));
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced === null) return; // not known yet: hold at empty
    progress.value = reduced
      ? target
      : withTiming(target, { duration: RING_MS, easing: EASE });
  }, [reduced, target, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      // The headline and score line carry the meaning; the ring is a picture.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      aria-hidden
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius - strokeWidth / 2} fill={fill} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={arc}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          position: 'absolute',
          fontFamily,
          fontSize: size * 0.28,
          color: theme.colors.onBackground,
        }}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- flourish
interface Piece {
  angle: number;
  distance: number;
  size: number;
  shape: 'dot' | 'tile' | 'bar';
  colorKey: 'success' | 'primary' | 'warning' | 'videoAccent' | 'lessonChip' | 'selection';
  spin: number;
}

// Twelve pieces, evenly spread round the ring, alternating near and far.
const PIECES: Piece[] = [
  { angle: 0, distance: 1, size: 10, shape: 'dot', colorKey: 'success', spin: 90 },
  { angle: 30, distance: 0.8, size: 8, shape: 'bar', colorKey: 'warning', spin: 160 },
  { angle: 60, distance: 1.05, size: 10, shape: 'tile', colorKey: 'primary', spin: -120 },
  { angle: 90, distance: 0.85, size: 8, shape: 'dot', colorKey: 'videoAccent', spin: 60 },
  { angle: 120, distance: 1, size: 10, shape: 'bar', colorKey: 'success', spin: -180 },
  { angle: 150, distance: 0.8, size: 8, shape: 'tile', colorKey: 'lessonChip', spin: 140 },
  { angle: 180, distance: 1.05, size: 10, shape: 'dot', colorKey: 'warning', spin: -60 },
  { angle: 210, distance: 0.85, size: 8, shape: 'bar', colorKey: 'primary', spin: 120 },
  { angle: 240, distance: 1, size: 10, shape: 'tile', colorKey: 'selection', spin: -150 },
  { angle: 270, distance: 0.8, size: 8, shape: 'dot', colorKey: 'success', spin: 80 },
  { angle: 300, distance: 1.05, size: 10, shape: 'bar', colorKey: 'videoAccent', spin: -100 },
  { angle: 330, distance: 0.85, size: 8, shape: 'tile', colorKey: 'warning', spin: 170 },
];

function Burst({ piece, ringSize, t }: { piece: Piece; ringSize: number; t: Animated.SharedValue<number> }) {
  const theme = useTheme();
  const rad = (piece.angle * Math.PI) / 180;
  const reach = (ringSize / 2) * 0.35 + 14; // how far past the ring edge it travels
  const r0 = ringSize / 2;
  const w = piece.shape === 'bar' ? piece.size * 1.8 : piece.size;
  const h = piece.shape === 'bar' ? piece.size * 0.6 : piece.size;
  const style = useAnimatedStyle(() => {
    const d = r0 + reach * piece.distance * t.value;
    return {
      opacity: t.value === 0 ? 0 : 1 - t.value * t.value,
      transform: [
        { translateX: Math.cos(rad) * d },
        { translateY: Math.sin(rad) * d },
        { rotate: `${piece.spin * t.value}deg` },
        { scale: 0.6 + 0.6 * (1 - t.value) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: w,
          height: h,
          marginLeft: -w / 2,
          marginTop: -h / 2,
          backgroundColor: theme.colors[piece.colorKey],
          borderRadius: piece.shape === 'tile' ? 2 : 999,
        },
        style,
      ]}
    />
  );
}

function Flourish({ ringSize, reduced }: { ringSize: number; reduced: boolean | null }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced !== false) return; // reduced or unknown: no confetti
    t.value = withDelay(BURST_DELAY_MS, withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
  }, [reduced, t]);
  if (reduced !== false) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      aria-hidden
      style={{ position: 'absolute', left: 0, top: 0, width: ringSize, height: ringSize, overflow: 'visible' }}>
      {PIECES.map(p => (
        <Burst key={p.angle} piece={p} ringSize={ringSize} t={t} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- screen
export default function CorporateResult({
  band,
  variant,
  score,
  maxScore,
  percentage,
  metaLine,
  onFinish,
}: CorporateResultProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const title = useTypeRole('screenTitle');
  const body = useTypeRole('body');
  const compact = height < COMPACT_HEIGHT;
  const passed = band === 'passed';
  const playful = variant === 'B' && passed;

  // Colour follows the band, never red or orange. Pass: success green text
  // (successText, 5.4:1 on white) with a green arc on a pale mint disc.
  // Otherwise: the brand blue arc and ink.
  const arc = passed ? theme.colors.successText : theme.colors.primary;
  const ringFill = passed ? theme.colors.cards[1].primary : theme.colors.primaryLight;
  const headlineColor = passed ? theme.colors.successText : theme.colors.onBackground;

  const headline = t(`corporate.result.${band}Title`);
  const score_ = t('corporate.result.score', { score, max: maxScore });
  const spoken = t('corporate.result.scoreSpoken', {
    score,
    max: maxScore,
    percent: Math.round(percentage),
  });
  const hint =
    band === 'close'
      ? t('corporate.result.closeHint')
      : band === 'far'
        ? t('corporate.result.farHint')
        : null;

  // Gentle bounce on the headline (B, pass only).
  const bounce = useSharedValue(0);
  useEffect(() => {
    if (!playful || reduced !== false) return;
    bounce.value = withDelay(
      RING_MS - 200,
      withSequence(
        withTiming(-8, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.bounce }),
      ),
    );
  }, [playful, reduced, bounce]);
  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  const ringSize = compact ? 112 : 148;

  const headlineNode = (
    <Animated.View style={bounceStyle}>
      <Text
        accessibilityRole="header"
        aria-level={1}
        style={{
          fontFamily: title.fontFamily,
          fontSize: title.fontSize,
          lineHeight: title.lineHeight,
          color: headlineColor,
          textAlign: compact ? 'left' : 'center',
        }}>
        {headline}
      </Text>
    </Animated.View>
  );

  const textColumn = (
    <View style={{ alignItems: compact ? 'flex-start' : 'center', flexShrink: 1 }}>
      {headlineNode}
      <Text
        accessibilityLabel={spoken}
        style={{
          marginTop: 8,
          fontFamily: body.fontFamily,
          fontSize: body.fontSize + 1,
          lineHeight: body.lineHeight + 2,
          color: theme.colors.onSurface,
          textAlign: compact ? 'left' : 'center',
        }}>
        {score_}
      </Text>
      {hint && (
        <Text
          style={{
            marginTop: 4,
            maxWidth: 440,
            fontFamily: body.fontFamily,
            fontSize: body.fontSize,
            lineHeight: body.lineHeight,
            color: theme.colors.onSurfaceVariant,
            textAlign: compact ? 'left' : 'center',
          }}>
          {hint}
        </Text>
      )}
      {metaLine.length > 0 && (
        <View style={{ marginTop: compact ? 8 : 16 }}>
          <EyebrowText>{metaLine}</EyebrowText>
        </View>
      )}
    </View>
  );

  const ring = (
    <View style={{ width: ringSize, height: ringSize }}>
      <ScoreRing
        percentage={percentage}
        size={ringSize}
        arc={arc}
        fill={ringFill}
        reduced={reduced}
        label={`${Math.round(percentage)}%`}
      />
      {playful && <Flourish ringSize={ringSize} reduced={reduced} />}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: compact ? 8 : theme.layouts.pageVerticalPadding,
      }}>
      <QuestionColumn>
        <View style={{ alignItems: 'center' }}>
          <ResultIllustration band={band} reducedMotion={reduced !== false} compact={compact} />
          {compact ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28 }}>
              {ring}
              {textColumn}
            </View>
          ) : (
            <>
              <EyebrowText>{t('screen.result.header')}</EyebrowText>
              <View style={{ height: 20 }} />
              {ring}
              <View style={{ height: 24 }} />
              {textColumn}
            </>
          )}
          <View style={{ height: compact ? 16 : 32 }} />
          {/* A normal pill: full width on phones, capped and centred on wide screens. */}
          <View style={{ width: '100%', maxWidth: FINISH_MAX_WIDTH, alignSelf: 'center' }}>
            <AppButton label={t('screen.result.finishButton')} onPress={onFinish} fullWidth />
          </View>
        </View>
      </QuestionColumn>
    </ScrollView>
  );
}
