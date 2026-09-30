import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useBreakpoint, useResource } from '@/services';
import QuizOption from '@/components/ui/QuizOption';
import OptionAudioCircle, {
  OPTION_AUDIO_SIZE,
} from '@/components/kit/OptionAudioCircle';
import ExpandedWithLayout from '@/components/layouts/ExpandedWithLayout';
import PracticeFile from '@/components/practices/PracticeFile';
import { useReplayClip } from '@/components/kit/audio/useReplayClip';
import { evaluateMcqText, mcqOptionState, toggleSelection } from './mcqTextLogic';
import type { QuestionBodyProps } from './types';
import { useReportAnswer } from './useReportAnswer';

/**
 * Multiple choice, text (templates 1 and 3), for CorporateQuestionShell.
 * Behaviour is today's PracticeMCQText: options are shuffled per attempt,
 * tapping toggles an option (several may be chosen, on both templates),
 * and an attempt starts with nothing chosen.
 */
export default function McqTextBody({
  question,
  tries,
  resetKey,
  disabled,
  marks,
  showAnswer,
  report,
}: QuestionBodyProps) {
  const theme = useTheme();
  const isGrid =
    useBreakpoint({ mobile: false, phablet: false, tablet: true, desktop: true }) === true;

  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  // When some options have audio, the others keep the same space so the
  // option cards line up.
  const anyAudio = questionOptions.some(
    o => !_.isEmpty(_.get(o, 'questionoptionfile.filename')),
  );
  // Reshuffled per attempt, as today (keyed on tries).
  const options = useMemo(() => _.shuffle(questionOptions), [tries, questionOptions]);

  const [selections, setSelections] = useState<Record<string, QuestionOption>>({});
  // Retry / Try again clear the answer; so does Show answer (as today).
  useEffect(() => {
    setSelections({});
  }, [resetKey, showAnswer]);

  // Multiple choice can always be submitted: today an empty answer grades as wrong.
  useReportAnswer(report, true, () => evaluateMcqText(questionOptions, selections));

  // The question's own media (questionfile), as today: a picture, or a clip
  // that plays when it is tapped.
  const questionFile = _.get(question, 'questionobject.questionfile');
  const fileSource = useResource(
    { name: _.get(questionFile, 'filename', '') },
    [question],
  );
  const fileClip = useReplayClip('question-file', fileSource);

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
        accessibilityRole="radiogroup"
        style={
          isGrid
            ? { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 14 }
            : { rowGap: 12 }
        }>
        {options.map((item, index) => (
          <McqTextOption
            key={item.questionoptionid}
            option={item}
            index={index}
            grid={isGrid}
            reserveAudio={anyAudio}
            state={mcqOptionState(item, {
              selected: !_.isEmpty(selections[item.questionoptionid]),
              marks,
              showAnswer,
            })}
            disabled={disabled}
            onPress={() =>
              setSelections(s => toggleSelection(s, item.questionoptionid, item))
            }
          />
        ))}
      </View>
    </View>
  );
}

function McqTextOption({
  option,
  index,
  grid,
  reserveAudio,
  state,
  disabled,
  onPress,
}: {
  option: QuestionOption;
  index: number;
  grid: boolean;
  reserveAudio: boolean;
  state: ReturnType<typeof mcqOptionState>;
  disabled: boolean;
  onPress: () => void;
}) {
  const audio = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option.questionoptionid],
  );
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
        grid ? { flexBasis: '45%', flexGrow: 1, maxWidth: '50%' } : null,
      ]}>
      <View style={{ flex: 1 }}>
        <QuizOption
          testID={`answer-option-${index}`}
          label={option.questionoptiontext}
          state={state}
          disabled={disabled}
          onPress={onPress}
        />
      </View>
      {audio ? (
        <OptionAudioCircle
          testID={`answer-option-audio-${index}`}
          clipId={`option-${option.questionoptionid}`}
          source={audio}
          label={option.questionoptiontext}
        />
      ) : reserveAudio ? (
        <View style={{ width: OPTION_AUDIO_SIZE }} />
      ) : null}
    </View>
  );
}
