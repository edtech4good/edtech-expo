import { AppButton, EyebrowText } from '@/components';
import { QuestionColumn } from '@/components/kit';
import { useFont, useTypeRole } from '@/services';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import { ResultBand } from './resultBand';
import { pickCharacter } from './mascot';
import ResultIllustration, { hasResultIllustration, MASCOT_GAP } from './ResultIllustration';
import useReducedMotion from './useReducedMotion';

export interface CorporateResultProps {
  band: ResultBand;
  score: number;
  maxScore: number;
  percentage: number;
  metaLine: string;
  onFinish: () => void;
}

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const RING_MS = 900;
/** On wide screens the Finish pill stops at this width, centred. */
const FINISH_MAX_WIDTH = 360;
/** Phones turned sideways are too short for the stacked layout. */
const COMPACT_HEIGHT = 500;

/** Readable by screen readers, invisible and out of the layout. */
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  opacity: 0,
} as const;

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

// ---------------------------------------------------------------- screen
export default function CorporateResult({
  band,
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
  // One mascot per mount: random, never re-rolled by a re-render.
  const [character] = useState(() => pickCharacter());
  const compact = height < COMPACT_HEIGHT;
  const passed = band === 'passed';

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

  const ringSize = compact ? 112 : 148;

  const headlineNode = (
    <View>
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
    </View>
  );

  const textColumn = (
    <View style={{ alignItems: compact ? 'flex-start' : 'center', flexShrink: 1 }}>
      {headlineNode}
      {/* Native reads the label. Web ignores aria-label on a plain Text, so
          there the visible line is hidden from assistive tech and the full
          sentence (with the percent) is read from a visually hidden twin. */}
      <Text
        accessibilityLabel={Platform.OS === 'web' ? undefined : spoken}
        aria-hidden={Platform.OS === 'web' ? true : undefined}
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
      {Platform.OS === 'web' && (
        <Text style={VISUALLY_HIDDEN}>{spoken}</Text>
      )}
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
    </View>
  );

  const showMascot = hasResultIllustration();
  const mascot = (
    <ResultIllustration
      band={band}
      character={character}
      reducedMotion={reduced !== false}
      compact={compact}
    />
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
          {!compact && showMascot && (
            <View style={{ marginBottom: MASCOT_GAP }}>{mascot}</View>
          )}
          {compact ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28 }}>
              {showMascot && mascot}
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
