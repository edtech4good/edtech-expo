import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useBreakpoint, useFont, useResource } from '@/services';
import { fromQuestionDistractorToQuestionOption } from '@/transforms';
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
  BlankState,
  blankSlotState,
  emptyBlanks,
  evaluateFillBlank,
  fillActive,
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
    <View style={{ rowGap: 16 }}>
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
              alignItems: 'center',
              maxWidth: '100%',
              minHeight: wide ? 60 : 52,
            }}>
            {unit.map((piece, p) =>
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
                  locked={locked}
                  onPress={() => setState(s => tapBlank(s, piece.index))}
                />
              ),
            )}
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
        <View
          testID="fill-blank-bank"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: 12,
            rowGap: 12,
          }}>
          {bank.map(tile => (
            <BankTile
              key={tile.questionoptionid}
              tile={tile}
              used={isUsed(view.filled, tile.questionoptionid)}
              locked={locked}
              ghost={ghost}
              onPress={() => setState(s => fillActive(s, tile.questionoptionid))}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function BlankSlot({
  index,
  tile,
  slotState,
  locked,
  onPress,
}: {
  index: number;
  tile: QuestionOption | undefined;
  slotState: ReturnType<typeof blankSlotState>;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Slot
      testID={`fill-blank-${index}`}
      variant="blank"
      state={slotState}
      label={tile?.questionoptiontext}
      onPress={locked ? undefined : onPress}
    />
  );
}

function BankTile({
  tile,
  used,
  locked,
  ghost,
  onPress,
}: {
  tile: QuestionOption;
  used: boolean;
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
        <MovableTile
          testID={`fill-tile-${tile.questionoptionid}`}
          label={tile.questionoptiontext}
          state={locked ? 'disabled' : 'default'}
          onPress={locked ? undefined : onPress}
        />
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
