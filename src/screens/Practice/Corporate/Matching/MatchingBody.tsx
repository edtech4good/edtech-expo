import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useResource } from '@/services';
import MovableTile from '@/components/kit/MovableTile';
import Slot from '@/components/kit/Slot';
import ResultMark from '@/components/kit/ResultMark';
import OptionAudioCircle from '@/components/kit/OptionAudioCircle';
import { CrossGlyph } from '@/components/kit/glyphs';
import { useSmallText, useTileText } from '@/components/kit/kitText';
import { slotFrame, CORRECT_TINT_ALPHA, INCORRECT_TINT_ALPHA } from '@/components/kit/tileStyle';
import OptionImage, { useOptionImageSlot } from '@/components/practices/OptionImage';
import hexAlpha from '@/utils/hexAlpha';
import {
  answerLetters,
  answerName,
  answerParts,
  bankOrder,
  chipState,
  correctPlacement,
  EMPTY_MATCH,
  evaluateMatching,
  instructionText,
  isReady,
  MatchSlotState,
  pressChip,
  pressSlot,
  promptName,
  promptParts,
  promptVisual,
  slotA11yLabel,
  slotState,
  Tr,
} from '../matchingLogic';
import type { QuestionBodyProps } from '../types';
import { useReportAnswer } from '../useReportAnswer';

const PICTURE = 44; // thumbnail beside a picture answer inside a slot

/**
 * Matching (template 7), for CorporateQuestionShell. Each option is a prompt
 * with its own slot, joined in one card; its `questionassociate` is the answer
 * chip that belongs there. Chips wait in a bank below. Tap works in either
 * order (chip then slot, or slot then chip) and tapping a placed chip sends it
 * back to the bank. Dragging is not offered: only the tap path.
 */
export default function MatchingBody({
  question,
  tries,
  resetKey,
  disabled,
  marks,
  showAnswer,
  report,
}: QuestionBodyProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const small = useSmallText();

  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  const slotIds = useMemo(() => questionOptions.map(o => o.questionoptionid), [questionOptions]);
  // Reshuffled per attempt, as the contract asks (keyed on tries). No answer
  // sits at its own prompt's position, and each answer's letter (for a label
  // it needs when it has no words) follows its bank position, so neither
  // gives the pairing away.
  const bank = useMemo(() => {
    const byId = new Map(questionOptions.map(o => [o.questionoptionid, o]));
    return bankOrder(slotIds).map(id => byId.get(id)!);
  }, [tries, questionOptions, slotIds]);
  const letters = useMemo(() => answerLetters(bank.map(o => o.questionoptionid)), [bank]);

  const [tap, setTap] = useState(EMPTY_MATCH);
  // Retry / Try again clear the answer; so does Show answer (as today).
  useEffect(() => {
    setTap(EMPTY_MATCH);
  }, [resetKey, showAnswer]);

  const placed = showAnswer ? correctPlacement(slotIds) : tap.placed;
  const ready = isReady(tap.placed, slotIds);
  useReportAnswer(report, ready, () => evaluateMatching(questionOptions, tap.placed));

  const optionById = useMemo(
    () => new Map(questionOptions.map((o, i) => [o.questionoptionid, { option: o, n: i + 1 }])),
    [questionOptions],
  );
  const locked = disabled || showAnswer || marks !== null;
  const showBank = !locked;

  // The line above the list says what to do next.
  const tr = t as Tr;
  const nameOfChip = (id: string) => answerName(optionById.get(id)!.option, letters[id], tr);
  const nameOfPrompt = (id: string) => promptName(optionById.get(id)!.option, optionById.get(id)!.n, tr);
  const pickedName = tap.pickedChip !== null ? nameOfChip(tap.pickedChip) : '';
  const instruction = instructionText(
    {
      tap,
      allText: questionOptions.every(o => promptParts(o).kind === 'text'),
      pickedName,
      activePrompt: tap.activeSlot !== null ? nameOfPrompt(tap.activeSlot) : '',
    },
    tr,
  );

  return (
    <View style={{ rowGap: 14 }}>
      {showBank ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: theme.colors.primaryLight,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}>
          <Text
            style={{
              fontFamily: small.fontFamily,
              fontSize: small.fontSize,
              lineHeight: small.lineHeight,
              color: theme.colors.primaryDark,
            }}>
            {instruction}
          </Text>
        </View>
      ) : null}

      <View style={{ rowGap: 6 }}>
        {questionOptions.map((option, index) => (
          <MatchRow
            key={option.questionoptionid}
            option={option}
            index={index}
            chipId={placed[option.questionoptionid]}
            chip={optionById.get(placed[option.questionoptionid])}
            letters={letters}
            pickedName={pickedName}
            state={slotState(option.questionoptionid, { ...tap, placed }, { marks, showAnswer })}
            locked={locked}
            onPress={() => setTap(s => pressSlot(s, option.questionoptionid))}
          />
        ))}
      </View>

      {showBank ? (
        <View style={{ rowGap: 8 }}>
          <Text
            style={{
              fontFamily: small.fontFamily,
              fontSize: 11,
              lineHeight: small.km ? 18 : 14,
              letterSpacing: small.km ? 0 : 1.2,
              textAlign: 'center',
              textTransform: 'uppercase',
              color: theme.colors.onSurfaceVariant,
            }}>
            {t('corporate.matching.answers')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              columnGap: 10,
              rowGap: 10,
            }}>
            {bank.map(option => {
              const entry = optionById.get(option.questionoptionid)!;
              return (
                <BankChip
                  key={option.questionoptionid}
                  option={option}
                  index={entry.n - 1}
                  letter={letters[option.questionoptionid]}
                  state={chipState(option.questionoptionid, tap)}
                  onPress={() => setTap(s => pressChip(s, option.questionoptionid))}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---- labels ---------------------------------------------------------------

// ---- one joined row: prompt | slot ---------------------------------------

function MatchRow({
  option,
  index,
  chipId,
  chip,
  letters,
  pickedName,
  state,
  locked,
  onPress,
}: {
  option: QuestionOption;
  index: number;
  chipId: string | undefined;
  chip: { option: QuestionOption; n: number } | undefined;
  letters: Record<string, string>;
  pickedName: string;
  state: MatchSlotState;
  locked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tile = useTileText();
  const n = index + 1;
  const p = promptParts(option);
  const promptSrc = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option.questionoptionid],
  );
  const imageSlot = useOptionImageSlot(promptSrc, option.questionoptiontext);
  const label = promptVisual(option, n, t as Tr);
  const promptA11y = promptName(option, n, t as Tr);

  const result = state === 'correct' || state === 'incorrect';
  const tint =
    state === 'correct'
      ? { borderColor: theme.colors.success, backgroundColor: hexAlpha(theme.colors.success, CORRECT_TINT_ALPHA) }
      : state === 'incorrect'
        ? { borderColor: theme.colors.error, backgroundColor: hexAlpha(theme.colors.error, INCORRECT_TINT_ALPHA) }
        : { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface };

  const answer = chip ? answerParts(chip.option) : null;
  const answerLabelText = chip ? answerName(chip.option, letters[chip.option.questionoptionid], t as Tr) : '';
  const answerSrc = useResource(
    { name: chip ? _.get(chip.option, 'questionassociate.questionassociatefile.filename', '') : '' },
    [chipId],
  );

  return (
    <View
      testID={`match-row-${index}`}
      style={[
        styles.row,
        tint,
        { borderWidth: result ? 2 : 1, minHeight: 60 },
      ]}>
      <View
        style={[
          styles.prompt,
          { borderRightColor: result ? hexAlpha(theme.colors.onBackground, 0.08) : theme.colors.divider },
        ]}>
        {p.kind === 'audio' ? (
          <OptionAudioCircle
            testID={`match-prompt-audio-${index}`}
            clipId={`match-prompt-${option.questionoptionid}`}
            source={promptSrc}
            label={label}
          />
        ) : null}
        {/* One screen-reader stop for the prompt itself (its words, else "Picture 2"),
            with the picture's own label hidden inside; the audio circle stays its own stop. */}
        <View
          accessible
          accessibilityLabel={
            p.kind === 'image' && imageSlot.showPlaceholder
              ? `${promptA11y}. ${t('image.unavailable')}`
              : promptA11y
          }
          style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8, flexShrink: 1 }}>
          {p.kind === 'image' ? (
            <OptionImage
              source={promptSrc}
              label={option.questionoptiontext}
              slot={imageSlot}
              style={{ width: 56, height: 56, borderRadius: theme.radii.imageWell }}
              contentFit="cover"
            />
          ) : null}
          {p.kind !== 'image' || p.hasText ? (
            <Text
              testID={`match-prompt-${index}`}
              style={{
                flexShrink: 1,
                fontFamily: tile.fontFamily,
                fontSize: 16,
                lineHeight: tile.km ? 28 : 21,
                fontWeight: '700',
                color: theme.colors.onBackground,
              }}>
              {label}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.slotCell}>
        {/* The slot is one screen-reader stop that names its prompt; the inner
            Slot is hidden so it is not read twice. Same press as a tap. */}
        <View
          accessible
          accessibilityRole={locked ? undefined : 'button'}
          accessibilityLabel={slotA11yLabel(
            { prompt: promptA11y, answer: answerLabelText, state, pickedName },
            t as Tr,
          )}
          accessibilityActions={locked ? undefined : [{ name: 'activate' }]}
          onAccessibilityAction={locked ? undefined : () => onPress()}
          style={{ flex: 1, flexDirection: 'row' }}>
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            aria-hidden
            style={{ flex: 1, flexDirection: 'row' }}>
            {chip && answer?.kind === 'image' ? (
              <PlacedPicture
                testID={`match-slot-${index}`}
                state={state}
                label={answerLabelText}
                source={answerSrc}
                onPress={locked ? undefined : onPress}
              />
            ) : (
              <Slot
                testID={`match-slot-${index}`}
                state={state}
                label={answerLabelText}
                onPress={locked ? undefined : onPress}
              />
            )}
          </View>
        </View>
        {chip && answer?.kind === 'audio' ? (
          <OptionAudioCircle
            testID={`match-slot-audio-${index}`}
            clipId={`match-answer-${chipId}`}
            source={answerSrc}
            label={answerLabelText}
          />
        ) : null}
      </View>
    </View>
  );
}

/** A picture answer inside a slot: thumbnail, its caption, and the ✕ cue or result mark. */
function PlacedPicture({
  state,
  label,
  source,
  onPress,
  testID,
}: {
  state: MatchSlotState;
  label: string;
  source: string;
  onPress?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tile = useTileText();
  const frame = slotFrame(theme.colors, state as 'filled');
  const slot = useOptionImageSlot(source, label);
  const result = state === 'correct' || state === 'incorrect';
  const body = (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 8,
        minHeight: 48,
        padding: 4,
        borderRadius: 12,
        borderWidth: frame.borderWidth,
        borderColor: frame.borderColor,
        backgroundColor: frame.backgroundColor,
      }}>
      <OptionImage
        source={source}
        label={label}
        slot={slot}
        style={{ width: PICTURE, height: PICTURE, borderRadius: theme.radii.imageWell }}
        contentFit="cover"
      />
      <Text
        style={{
          flexShrink: 1,
          flexGrow: 1,
          fontFamily: tile.fontFamily,
          fontSize: 15,
          lineHeight: tile.km ? 26 : 22,
          color: frame.textColor,
        }}>
        {slot.showPlaceholder ? '' : label}
      </Text>
      {result ? (
        <ResultMark kind={state === 'correct' ? 'correct' : 'incorrect'} size={18} />
      ) : onPress ? (
        <View style={[styles.cue, { backgroundColor: theme.colors.surfaceVariant }]}>
          <CrossGlyph color={theme.colors.onSurfaceVariant} />
        </View>
      ) : null}
    </View>
  );
  const a11y = result
    ? t(state === 'correct' ? 'kit.mark.labelCorrect' : 'kit.mark.labelIncorrect', { label })
    : onPress
      ? t('kit.slot.a11yFilled', { label })
      : label;
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={{ flex: 1 }}>
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={testID} accessible accessibilityLabel={a11y} style={{ flex: 1 }}>
      {body}
    </View>
  );
}

// ---- one chip in the bank -------------------------------------------------

function BankChip({
  option,
  index,
  letter,
  state,
  onPress,
}: {
  option: QuestionOption;
  index: number;
  letter: string;
  state: 'default' | 'picked' | 'used';
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const a = answerParts(option);
  const src = useResource(
    { name: _.get(option, 'questionassociate.questionassociatefile.filename', '') },
    [option.questionoptionid],
  );
  const label = answerName(option, letter, t as Tr);
  const isImage = a.kind === 'image';
  const used = state === 'used';
  const tile = (
    <MovableTile
      testID={`match-chip-${index}`}
      state={state === 'picked' ? 'picked' : 'default'}
      variant={isImage ? 'image' : 'text'}
      label={label}
      imageSource={isImage ? src : undefined}
      imageHeight={72}
      reserveAudio={false}
      onPress={used ? undefined : onPress}
    />
  );
  return (
    <View
      accessibilityElementsHidden={used}
      importantForAccessibility={used ? 'no-hide-descendants' : 'auto'}
      style={{ flexDirection: 'row', alignItems: 'center', columnGap: 4, maxWidth: '100%' }}>
      <View style={isImage ? { width: 150 } : { flexShrink: 1 }}>
        <View style={used ? { opacity: 0 } : undefined}>{tile}</View>
        {used ? (
          <View
            testID={`match-ghost-${index}`}
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: isImage ? theme.radii.card : 12,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          />
        ) : null}
      </View>
      {a.kind === 'audio' && !used ? (
        <OptionAudioCircle
          testID={`match-chip-audio-${index}`}
          clipId={`match-answer-${option.questionoptionid}`}
          source={src}
          label={label}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden' },
  // 50/50 at every width: a fixed half each, so a long prompt wraps instead of
  // pushing its slot across.
  prompt: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
  },
  slotCell: { width: '50%', flexDirection: 'row', alignItems: 'stretch', columnGap: 4, padding: 5 },
  cue: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
