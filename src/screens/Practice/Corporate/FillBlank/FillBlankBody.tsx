import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useBreakpoint, useFont, useResource } from '@/services';
import { fromQuestionDistractorToQuestionOption } from '@/transforms';
import { DragStage, Draggable, DropTarget, useDragToTarget } from '@/components/drag';
import MovableTile from '@/components/kit/MovableTile';
import OptionAudioCircle from '@/components/kit/OptionAudioCircle';
import Slot from '@/components/kit/Slot';
import { useSmallText } from '@/components/kit/kitText';
import { slotFrame } from '@/components/kit/tileStyle';
import ExpandedWithLayout from '@/components/layouts/ExpandedWithLayout';
import PracticeFile from '@/components/practices/PracticeFile';
import { useReplayClip } from '@/components/kit/audio/useReplayClip';
import {
  answerBlanks,
  BlankDropTo,
  BlankState,
  blankSlotState,
  dropWord,
  emptyBlanks,
  evaluateFillBlank,
  fillActive,
  groupUnit,
  isReady,
  isUsed,
  parseSentence,
  tapBlank,
} from './fillBlankLogic';
import type { QuestionBodyProps } from '../types';
import { useReportAnswer } from '../useReportAnswer';

/**
 * Fill in the blank (template 8), for CorporateQuestionShell. Behaviour is
 * today's PracticeFillBlank (the bank holds the options and the distractors,
 * shuffled per attempt; the words placed in blank order are the answer), plus:
 * the first empty blank is active, a tapped word fills it and the active blank
 * moves on, tapping a filled blank takes its word back, and Submit waits for
 * every blank.
 *
 * Words can also be dragged (DragToTarget): a bank word onto a blank fills
 * it (a word already there goes back to the bank), a placed word onto
 * another blank swaps the two, onto the bank empties its blank, and a drop
 * anywhere else changes nothing. Each drop is the taps it stands for
 * (dropWord in fillBlankLogic). Drag is pointer-only: tapping stays the
 * accessible path.
 */
export default function FillBlankBody({
  question,
  tries,
  resetKey,
  resultState,
  disabled,
  marks,
  showAnswer,
  report,
}: QuestionBodyProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const small = useSmallText();
  const sentenceFont = useFont('bold', 'display');
  const wide =
    useBreakpoint({ mobile: false, phablet: false, tablet: true, desktop: true }) === true;

  const questionOptions = useMemo(
    () => (_.get(question, 'questionobject.questionoptions', []) ?? []) as QuestionOption[],
    [question],
  );
  // The bank: the options and the distractors (as today), reshuffled per
  // attempt (keyed on tries).
  const tiles = useMemo(
    () => [
      ...fromQuestionDistractorToQuestionOption(
        _.get(question, 'questionobject.questiondistractors', []),
      ),
      ...questionOptions,
    ],
    [question, questionOptions],
  );
  const bank = useMemo(() => _.shuffle(tiles), [tries, tiles]);
  const tileById = useMemo(
    () => new Map(tiles.map(o => [o.questionoptionid, o])),
    [tiles],
  );

  const blankCount = questionOptions.length;
  const units = useMemo(
    () => parseSentence(question.questiontext, blankCount),
    [question.questiontext, blankCount],
  );

  // Retry / Try again clear the blanks; so does Show answer (as today).
  const [state, setState] = useState<BlankState>(() => emptyBlanks(blankCount));
  const [lastReset, setLastReset] = useState({ resetKey, showAnswer });
  if (lastReset.resetKey !== resetKey || lastReset.showAnswer !== showAnswer) {
    setLastReset({ resetKey, showAnswer });
    setState(emptyBlanks(blankCount));
  }
  const view: BlankState = showAnswer ? answerBlanks(questionOptions) : state;

  const ready = isReady(view.filled);
  useReportAnswer(report, ready, () =>
    evaluateFillBlank(questionOptions, tiles, view.filled),
  );

  const locked = disabled || resultState !== 'answering';

  // ---- Drag. Draggable ids: `bank:<tile>` and `blank:<index>`; target ids:
  // `blank:<index>` and `bank`.
  const onDrop = useCallback((dragId: string, target: string | null) => {
    const to = parseTarget(target);
    if (dragId.startsWith('bank:')) {
      const tileId = dragId.slice(5);
      setState(s => dropWord(s, tileId, { kind: 'bank' }, to));
    } else if (dragId.startsWith('blank:')) {
      const index = Number(dragId.slice(6));
      setState(s => {
        const tileId = s.filled[index];
        return tileId ? dropWord(s, tileId, { kind: 'blank', index }, to) : s;
      });
    }
  }, []);
  // A hold that never moved is the tap on what was held.
  const onHoldTap = useCallback((dragId: string) => {
    if (dragId.startsWith('bank:')) {
      const tileId = dragId.slice(5);
      setState(s => fillActive(s, tileId));
    } else if (dragId.startsWith('blank:')) {
      const index = Number(dragId.slice(6));
      setState(s => tapBlank(s, index));
    }
  }, []);
  const canDrag = !locked && !showAnswer;
  const dnd = useDragToTarget({ onDrop, onHoldTap, enabled: canDrag });
  const dragging = dnd.active;

  // The question's own picture (or clip), as the multiple choice body does.
  const questionFile = _.get(question, 'questionobject.questionfile');
  const fileSource = useResource(
    { name: _.get(questionFile, 'filename', '') },
    [question],
  );
  const fileClip = useReplayClip('question-file', fileSource);

  const sentenceSize = wide ? 24 : 18;
  const sentenceStyle = {
    fontFamily: sentenceFont,
    fontSize: sentenceSize,
    lineHeight: small.km ? sentenceSize * 1.65 : sentenceSize * 1.4,
    color: theme.colors.onBackground,
  } as const;
  const ghost = slotFrame(theme.colors, 'empty');

  const hint = (() => {
    if (locked) return null;
    if (view.filled.every(f => f !== null)) return t('corporate.fillBlank.hintDone');
    return t('corporate.fillBlank.hintActive', {
      n: view.active + 1,
      total: blankCount,
    });
  })();

  return (
    <DragStage
      controller={dnd}
      testID="fill-stage"
      style={{ rowGap: 16 }}
      renderLifted={id => {
        const tileId = id.startsWith('bank:')
          ? id.slice(5)
          : (view.filled[Number(id.slice(6))] ?? '');
        const tile = tileById.get(tileId);
        return tile ? (
          <View style={{ transform: [{ rotate: '-3deg' }] }}>
            <MovableTile label={tile.questionoptiontext} state="dragging" />
          </View>
        ) : null;
      }}>
      {!_.isEmpty(fileSource) ? (
        <View style={{ height: 220 }}>
          <ExpandedWithLayout
            backgroundColor={theme.colors.surface}
            justifyContent="center"
            borderRadius={theme.radii.card}
            style={{ borderWidth: 1, borderColor: theme.colors.divider }}>
            <PracticeFile
              id={_.get(question, 'questionid', '')}
              file={questionFile}
              onPress={() => void fileClip.play()}
            />
          </ExpandedWithLayout>
        </View>
      ) : null}

      <View
        testID="fill-blank-sentence"
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.card,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          columnGap: 8,
        }}>
        {units.map((unit, u) => (
          <View
            key={u}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              maxWidth: '100%',
              minHeight: wide ? 60 : 52,
            }}>
            {groupUnit(unit).map((group, g) => (
              <View
                key={g}
                style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '100%' }}>
                {group.map((piece, p) =>
                  piece.kind === 'text' ? (
                    <Text key={p} style={[sentenceStyle, { flexShrink: 1 }]}>
                      {piece.text}
                    </Text>
                  ) : (
                    <BlankSlot
                      key={p}
                      index={piece.index}
                      tile={tileById.get(view.filled[piece.index] ?? '')}
                      slotState={blankSlotState({
                        tileId: view.filled[piece.index] ?? null,
                        index: piece.index,
                        active: view.active,
                        marks,
                        showAnswer,
                      })}
                      hover={dragging?.over === `blank:${piece.index}`}
                      lifted={dragging?.id === `blank:${piece.index}`}
                      draggable={canDrag && view.filled[piece.index] !== null}
                      locked={locked}
                      onPress={dnd.guardPress(() => setState(s => tapBlank(s, piece.index)))}
                    />
                  ),
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      {hint ? (
        <Text
          testID="fill-blank-hint"
          style={{
            fontFamily: small.fontFamily,
            fontSize: small.fontSize,
            lineHeight: small.lineHeight,
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
          }}>
          {hint}
        </Text>
      ) : null}

      {showAnswer ? null : (
        <DropTarget
          id="bank"
          testID="fill-blank-bank"
          style={[
            styles.bank,
            // A placed word dragged over the bank: it will go back there.
            dragging?.over === 'bank' && dragging.id.startsWith('blank:')
              ? { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }
              : null,
          ]}>
          {bank.map(tile => {
            const used = isUsed(view.filled, tile.questionoptionid);
            return (
              <BankTile
                key={tile.questionoptionid}
                tile={tile}
                used={used}
                lifted={dragging?.id === `bank:${tile.questionoptionid}`}
                draggable={canDrag && !used}
                locked={locked}
                ghost={ghost}
                onPress={dnd.guardPress(() => setState(s => fillActive(s, tile.questionoptionid)))}
              />
            );
          })}
        </DropTarget>
      )}
    </DragStage>
  );
}

function parseTarget(target: string | null): BlankDropTo {
  if (target === null) return null;
  if (target === 'bank') return { kind: 'bank' };
  if (target.startsWith('blank:')) return { kind: 'blank', index: Number(target.slice(6)) };
  return null;
}

function BlankSlot({
  index,
  tile,
  slotState,
  hover,
  lifted,
  draggable,
  locked,
  onPress,
}: {
  index: number;
  tile: QuestionOption | undefined;
  slotState: ReturnType<typeof blankSlotState>;
  /** A drag is over this blank. */
  hover: boolean;
  /** Its word is the one being dragged: drawn empty (the ghost). */
  lifted: boolean;
  draggable: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  // While its word is lifted the blank is drawn as a ghost OVER the slot,
  // which stays mounted underneath (only hidden): replacing the element
  // under the pointer mid-drag would lose the pointer on the web.
  const ghost = slotFrame(theme.colors, hover ? 'hover' : 'empty');
  return (
    <DropTarget id={`blank:${index}`}>
      {/* A placed word can be dragged out. Draggable adds no element a
          screen reader or the keyboard reaches: the Slot stays the control. */}
      <Draggable id={`blank:${index}`} enabled={draggable}>
        <View style={lifted ? styles.hidden : undefined}>
          <Slot
            testID={`fill-blank-${index}`}
            variant="blank"
            state={hover && !lifted ? 'hover' : slotState}
            label={tile?.questionoptiontext}
            onPress={locked ? undefined : onPress}
          />
        </View>
        {lifted ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 10,
                borderWidth: ghost.borderWidth,
                borderStyle: ghost.borderStyle,
                borderColor: ghost.borderColor,
                backgroundColor: ghost.backgroundColor,
              },
            ]}
          />
        ) : null}
      </Draggable>
    </DropTarget>
  );
}

function BankTile({
  tile,
  used,
  lifted,
  draggable,
  locked,
  ghost,
  onPress,
}: {
  tile: QuestionOption;
  used: boolean;
  /** Being dragged: drawn as the dashed ghost, but still mounted. */
  lifted: boolean;
  draggable: boolean;
  locked: boolean;
  ghost: ReturnType<typeof slotFrame>;
  onPress: () => void;
}) {
  const small = useSmallText();
  const audio = useResource(
    { name: _.get(tile, 'questionoptionfile.filename', '') },
    [tile.questionoptionid],
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 4 }}>
      {used ? (
        // A word in a blank leaves a dashed ghost, so the bank does not jump.
        <View
          testID={`fill-tile-${tile.questionoptionid}`}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            minHeight: 48,
            minWidth: 48,
            borderRadius: 12,
            borderWidth: ghost.borderWidth,
            borderStyle: 'dashed',
            borderColor: ghost.borderColor,
            backgroundColor: ghost.backgroundColor,
            paddingHorizontal: 14,
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 17, lineHeight: small.km ? 30 : 22, opacity: 0 }}>
            {tile.questionoptiontext}
          </Text>
        </View>
      ) : (
        <Draggable id={`bank:${tile.questionoptionid}`} enabled={draggable}>
          <View style={lifted ? { opacity: 0 } : undefined}>
            <MovableTile
              testID={`fill-tile-${tile.questionoptionid}`}
              label={tile.questionoptiontext}
              state={locked ? 'disabled' : 'default'}
              onPress={locked ? undefined : onPress}
            />
          </View>
          {lifted ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 12,
                  borderWidth: ghost.borderWidth,
                  borderStyle: 'dashed',
                  borderColor: ghost.borderColor,
                  backgroundColor: ghost.backgroundColor,
                },
              ]}
            />
          ) : null}
        </Draggable>
      )}
      {audio ? (
        <OptionAudioCircle
          testID={`fill-tile-audio-${tile.questionoptionid}`}
          clipId={`option-${tile.questionoptionid}`}
          source={audio}
          label={tile.questionoptiontext}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 4,
  },
});
