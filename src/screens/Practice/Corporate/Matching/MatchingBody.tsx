import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useResource } from '@/services';
import { DragStage, Draggable, DropTarget, useDragToTarget } from '@/components/drag';
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
  dropChip,
  EMPTY_MATCH,
  evaluateMatching,
  instructionText,
  isReady,
  MatchDragFrom,
  MatchDropTo,
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
 * back to the bank.
 *
 * Chips can also be dragged (DragToTarget): a bank chip onto a row places it,
 * a placed chip onto another row swaps the two, onto the bank takes it back,
 * and a drop anywhere else changes nothing. Each drop is the taps it stands
 * for (dropChip in matchingLogic), so it ends where those taps would. Drag
 * is pointer-only: the slot and chip Pressables stay the accessible path.
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

  // ---- Drag. Draggable ids: `bank:<chip>` and `slot:<slot>`; target ids:
  // `slot:<slot>` (the whole row) and `bank`.
  const placedRef = useRef(tap.placed);
  placedRef.current = tap.placed;
  const onDrop = useCallback((dragId: string, target: string | null) => {
    const source = parseDragId(dragId, placedRef.current);
    if (!source) return;
    setTap(s => dropChip(s, source.chipId, source.from, parseTarget(target)));
  }, []);
  // A hold that never moved is the tap on what was held.
  const onHoldTap = useCallback((dragId: string) => {
    if (dragId.startsWith('bank:')) {
      const chipId = dragId.slice(5);
      setTap(s => pressChip(s, chipId));
    } else if (dragId.startsWith('slot:')) {
      const slotId = dragId.slice(5);
      setTap(s => pressSlot(s, slotId));
    }
  }, []);
  const dnd = useDragToTarget({ onDrop, onHoldTap, enabled: !locked });
  const dragging = dnd.active;

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
    <DragStage
      controller={dnd}
      testID="match-stage"
      style={{ rowGap: 14 }}
      renderLifted={id => {
        const chipId = id.startsWith('bank:') ? id.slice(5) : tap.placed[id.slice(5)];
        const entry = chipId ? optionById.get(chipId) : undefined;
        return entry ? <LiftedChip option={entry.option} letter={letters[chipId]} /> : null;
      }}>
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
        {questionOptions.map((option, index) => {
          const slotId = option.questionoptionid;
          const state = slotState(slotId, { ...tap, placed }, { marks, showAnswer });
          // While dragging: the row under the pointer is the hover, and a
          // slot whose chip is lifted shows empty (its ghost).
          const lifted = dragging?.id === `slot:${slotId}`;
          const drawn: SlotLook =
            dragging?.over === `slot:${slotId}` ? 'hover' : lifted ? 'empty' : state;
          return (
            <DropTarget key={slotId} id={`slot:${slotId}`}>
              <MatchRow
                option={option}
                index={index}
                chipId={placed[slotId]}
                chip={optionById.get(placed[slotId])}
                letters={letters}
                pickedName={pickedName}
                state={state}
                drawn={drawn}
                lifted={lifted}
                locked={locked}
                onPress={dnd.guardPress(() => setTap(s => pressSlot(s, slotId)))}
              />
            </DropTarget>
          );
        })}
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
          <DropTarget
            id="bank"
            testID="match-bank"
            style={[
              styles.bank,
              // A placed chip dragged over the bank: it will go back there.
              dragging?.over === 'bank' && dragging.id.startsWith('slot:')
                ? { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }
                : null,
            ]}>
            {bank.map(option => {
              const chipId = option.questionoptionid;
              const entry = optionById.get(chipId)!;
              const state = chipState(chipId, tap);
              return (
                <BankChip
                  key={chipId}
                  option={option}
                  index={entry.n - 1}
                  letter={letters[chipId]}
                  state={state}
                  ghost={dragging?.id === `bank:${chipId}`}
                  draggable={!locked && state !== 'used'}
                  onPress={dnd.guardPress(() => setTap(s => pressChip(s, chipId)))}
                />
              );
            })}
          </DropTarget>
        </View>
      ) : null}
    </DragStage>
  );
}

/** A drag id back to the chip and where it came from (null if stale). */
function parseDragId(
  dragId: string,
  placed: Readonly<Record<string, string>>,
): { chipId: string; from: MatchDragFrom } | null {
  if (dragId.startsWith('bank:')) return { chipId: dragId.slice(5), from: { kind: 'bank' } };
  if (dragId.startsWith('slot:')) {
    const slotId = dragId.slice(5);
    const chipId = placed[slotId];
    return chipId ? { chipId, from: { kind: 'slot', slotId } } : null;
  }
  return null;
}

function parseTarget(target: string | null): MatchDropTo {
  if (target === null) return null;
  if (target === 'bank') return { kind: 'bank' };
  if (target.startsWith('slot:')) return { kind: 'slot', slotId: target.slice(5) };
  return null;
}

/** What a slot is drawn as: its state, or the drag's hover. */
type SlotLook = MatchSlotState | 'hover';

/** The copy of a chip that follows the pointer: drawn only, never a control. */
function LiftedChip({ option, letter }: { option: QuestionOption; letter: string }) {
  const { t } = useTranslation();
  const a = answerParts(option);
  const src = useResource(
    { name: _.get(option, 'questionassociate.questionassociatefile.filename', '') },
    [option.questionoptionid],
  );
  const isImage = a.kind === 'image';
  return (
    <View style={[isImage ? { width: 150 } : null, { transform: [{ rotate: '-2deg' }] }]}>
      <MovableTile
        state="dragging"
        variant={isImage ? 'image' : 'text'}
        label={answerName(option, letter, t as Tr)}
        imageSource={isImage ? src : undefined}
        imageHeight={72}
        reserveAudio={false}
      />
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
  drawn,
  lifted,
  locked,
  onPress,
}: {
  option: QuestionOption;
  index: number;
  chipId: string | undefined;
  chip: { option: QuestionOption; n: number } | undefined;
  letters: Record<string, string>;
  pickedName: string;
  /** The slot's state (what a screen reader hears). */
  state: MatchSlotState;
  /** What is drawn: the state, or the drag's hover / ghost. */
  drawn: SlotLook;
  /** Its chip is the one being dragged. */
  lifted: boolean;
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
        {/* The slot is ONE control: a Pressable with the composed label, so a tap,
            Enter and Space all activate it, and it is one tab stop. The Slot inside
            only draws it: it takes no touches and (on web) is inert, so it is not a
            second tab stop or read twice. */}
        {/* A placed chip can be dragged out of its slot. Draggable adds no
            element a screen reader or the keyboard reaches. */}
        <Draggable
          id={`slot:${option.questionoptionid}`}
          enabled={!locked && chipId !== undefined && state === 'filled'}
          liftAnchor="pointer"
          style={styles.slotDrag}>
        <Pressable
          testID={`match-slot-${index}`}
          accessibilityRole="button"
          accessibilityLabel={slotA11yLabel(
            { prompt: promptA11y, answer: answerLabelText, state, pickedName, locked },
            t as Tr,
          )}
          accessibilityState={{ disabled: locked }}
          disabled={locked}
          onPress={onPress}
          style={{ flex: 1, flexDirection: 'row' }}>
          <DrawnSlot>
            {chip && answer?.kind === 'image' && drawn === state ? (
              <PlacedPicture
                state={state}
                label={answerLabelText}
                source={answerSrc}
                showTakeBack={!locked}
              />
            ) : (
              <Slot
                state={drawn}
                label={lifted ? undefined : answerLabelText}
                decorative
                showTakeBack={!locked}
              />
            )}
          </DrawnSlot>
        </Pressable>
        </Draggable>
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

/** Draws a slot without being one: no touches, hidden from screen readers, and inert on web (no tab stop). */
function DrawnSlot({ children }: { children: ReactNode }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    // react-native-web passes no `inert` prop through, so set it on the element.
    if (Platform.OS === 'web') (ref.current as unknown as HTMLElement | null)?.setAttribute('inert', '');
  }, []);
  return (
    <View
      ref={ref}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      aria-hidden
      style={{ flex: 1, flexDirection: 'row' }}>
      {children}
    </View>
  );
}

/** A picture answer inside a slot: thumbnail, its caption, and the ✕ cue or result mark. */
function PlacedPicture({
  state,
  label,
  source,
  showTakeBack,
}: {
  state: MatchSlotState;
  label: string;
  source: string;
  /** Draw the ✕ cue (the parent Pressable is what takes the touch). */
  showTakeBack?: boolean;
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
      ) : showTakeBack ? (
        <View style={[styles.cue, { backgroundColor: theme.colors.surfaceVariant }]}>
          <CrossGlyph color={theme.colors.onSurfaceVariant} />
        </View>
      ) : null}
    </View>
  );
  // Drawn only: the parent Pressable is the one stop, so this is neither
  // focusable, clickable nor read by a screen reader.
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ flex: 1 }}>
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
  ghost,
  draggable,
  onPress,
}: {
  option: QuestionOption;
  index: number;
  letter: string;
  state: 'default' | 'picked' | 'used';
  /** Being dragged: drawn as the dashed ghost, but still mounted and pressable. */
  ghost: boolean;
  draggable: boolean;
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
  const dashed = used || ghost;
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
      <Draggable
        id={`bank:${option.questionoptionid}`}
        enabled={draggable}
        style={isImage ? { width: 150 } : { flexShrink: 1 }}>
        <View style={dashed ? { opacity: 0 } : undefined}>{tile}</View>
        {dashed ? (
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
      </Draggable>
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
  slotDrag: { flex: 1, flexDirection: 'row' },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 10,
    rowGap: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 4,
  },
});
