import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useResource } from '@/services';
import { ReorderableList, ReorderItem } from '@/components/drag';
import MovableTile from '@/components/kit/MovableTile';
import OptionAudioCircle from '@/components/kit/OptionAudioCircle';
import { tileFrameStyle } from '@/components/kit/tileStyle';
import {
  correctOrder,
  evaluateTextOrdering,
  wordState,
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
    () => _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  const anyAudio = questionOptions.some(
    o => !_.isEmpty(_.get(o, 'questionoptionfile.filename')),
  );

  const shuffled = useMemo<Word[]>(
    () =>
      _.shuffle(questionOptions).map(o => ({
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

  // The learner's current order, kept in step with the list (which owns it).
  const [order, setOrder] = useState<string[]>(() => shuffled.map(w => w.id));
  useEffect(() => {
    setOrder(items.map(w => w.id));
  }, [items, resetKey]);

  // Ordering can always be submitted; the last order is what is graded.
  useReportAnswer(report, true, () => evaluateTextOrdering(questionOptions, order));

  return (
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
        frameFor={item => {
          const s = wordState(item.id, { picked: false, marks, showAnswer });
          return s === 'correct' || s === 'incorrect'
            ? tileFrameStyle(theme.colors, s)
            : undefined;
        }}
        renderItem={(item, state) => (
          <MovableTile
            inList
            reserveAudio={anyAudio}
            label={item.label}
            state={wordState(item.id, { picked: state.picked, marks, showAnswer })}
          />
        )}
        renderAccessory={item => <WordAudio option={item.option} label={item.label} />}
      />
    </View>
  );
}

function WordAudio({ option, label }: { option: QuestionOption; label: string }) {
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
