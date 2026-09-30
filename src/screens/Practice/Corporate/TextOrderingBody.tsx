import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useResource } from '@/services';
import { ReorderableList, ReorderItem } from '@/components/drag';
import { useSmallText } from '@/components/kit/kitText';
import MovableTile from '@/components/kit/MovableTile';
import OptionAudioCircle from '@/components/kit/OptionAudioCircle';
import { tileFrameStyle } from '@/components/kit/tileStyle';
import {
  bannerFor,
  correctOrder,
  evaluateTextOrdering,
  ListStatus,
  shuffledNotSolved,
  wordState,
  wordStatusKey,
} from './textOrderingLogic';
import type { QuestionBodyProps } from './types';
import { useReportAnswer } from './useReportAnswer';

interface Word extends ReorderItem {
  option: QuestionOption;
}

/**
 * Word ordering (template 5), for CorporateQuestionShell. Words are shuffled
 * per attempt (keyed on `tries`, as today); the learner drags them into the
 * gaps or taps two to swap. Ordering can always be submitted.
 */
export default function TextOrderingBody({
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

  const questionOptions = useMemo(
    () =>
      _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  const shuffled = useMemo<Word[]>(
    () =>
      shuffledNotSolved(questionOptions).map(o => ({
        id: o.questionoptionid,
        label: o.questionoptiontext,
        option: o,
      })),
    [tries, questionOptions],
  );
  const solution = useMemo<Word[]>(
    () =>
      correctOrder(questionOptions).map(o => ({
        id: o.questionoptionid,
        label: o.questionoptiontext,
        option: o,
      })),
    [questionOptions],
  );
  const items = showAnswer ? solution : shuffled;
  const small = useSmallText();
  const [status, setStatus] = useState<ListStatus>({ kind: 'idle' });
  // A new list (attempt, or the revealed answer) starts idle.
  useEffect(() => setStatus({ kind: 'idle' }), [items, resetKey, disabled]);
  const banner = bannerFor(disabled ? { kind: 'idle' } : status);
  const line = {
    fontFamily: small.fontFamily,
    fontSize: small.fontSize,
    lineHeight: small.lineHeight,
    color: theme.colors.onSurfaceVariant,
  };

  // The learner's current order, kept in step with the list (which owns it).
  const [order, setOrder] = useState<string[]>(() => shuffled.map(w => w.id));
  useEffect(() => {
    setOrder(items.map(w => w.id));
  }, [items, resetKey]);

  // Ordering can always be submitted; the last order is what is graded.
  useReportAnswer(report, true, () =>
    evaluateTextOrdering(questionOptions, order),
  );

  return (
    <View style={{ rowGap: 12 }}>
      {/* The instruction line, or what the learner is doing now. Its height is
          reserved (two lines) so the tiles never move when it changes while
          answering. After Submit (or Show answer) there is nothing left to
          do, so it goes and gives its room back. */}
      {disabled ? null : (
        <View
          style={[
            {
              minHeight: 60,
              justifyContent: 'center',
              borderRadius: 12,
              paddingHorizontal: 12,
            },
            banner.live ? { backgroundColor: theme.colors.primaryLight } : null,
          ]}>
          {banner.live && banner.rest ? (
            <Text style={[line, { color: theme.colors.onBackground }]}>
              <Text style={{ color: theme.colors.primaryDark }}>
                {t(banner.lead!.key, banner.lead!.values)}
              </Text>{' '}
              {t(banner.rest.key, banner.rest.values)}
            </Text>
          ) : (
            <Text style={line}>
              {t('corporate.textOrdering.hintBefore')} ⠿{' '}
              {t('corporate.textOrdering.hintAfter')}
            </Text>
          )}
        </View>
      )}
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.radii.card,
          padding: 14,
        }}>
        <ReorderableList
          // A new attempt or the revealed answer starts a fresh list.
          key={`${showAnswer ? 'answer' : 'try'}-${tries}-${resetKey}`}
          testID="word-order"
          items={items}
          layout="inline"
          noun={t('reorder.noun.word')}
          disabled={disabled}
          onOrderChange={setOrder}
          onStatusChange={setStatus}
          // The mark reaches a screen reader through the tile's label: the
          // tile's own content is inside the labelled button and is not read.
          itemStatusFor={item => {
            const key = wordStatusKey(item.id, { marks, showAnswer });
            return key ? t(key) : undefined;
          }}
          frameFor={item => {
            const s = wordState(item.id, { picked: false, marks, showAnswer });
            return s === 'correct' || s === 'incorrect'
              ? tileFrameStyle(theme.colors, s)
              : undefined;
          }}
          renderItem={(item, state) => (
            // Room for the audio circle only where there is one (a taller tile too,
            // so the circle sits inside the border).
            <View
              style={
                hasAudio(item.option)
                  ? { minHeight: 52, justifyContent: 'center' }
                  : null
              }>
              <MovableTile
                inList
                reserveAudio={hasAudio(item.option)}
                label={item.label}
                state={wordState(item.id, {
                  picked: state.picked,
                  marks,
                  showAnswer,
                })}
              />
            </View>
          )}
          renderAccessory={item => (
            <WordAudio option={item.option} label={item.label} />
          )}
        />
      </View>
    </View>
  );
}

const hasAudio = (o: QuestionOption) =>
  !_.isEmpty(_.get(o, 'questionoptionfile.filename'));

function WordAudio({
  option,
  label,
}: {
  option: QuestionOption;
  label: string;
}) {
  const source = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option.questionoptionid],
  );
  if (!source) return null;
  return (
    <OptionAudioCircle
      testID={`word-audio-${option.questionoptionid}`}
      clipId={`option-${option.questionoptionid}`}
      source={source}
      label={label}
      placement="trailing-center"
    />
  );
}
