import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
import {
  compactColumns,
  evaluateMcqText,
  mcqOptionState,
  mcqResultLabelKey,
} from './mcqTextLogic';
import {
  selectionModeFor,
  selectionRoles,
  selectOption,
} from './selectionMode';
import type { QuestionBodyProps } from './types';
import { useReportAnswer } from './useReportAnswer';

/**
 * Multiple choice, text (templates 1 and 3), for CorporateQuestionShell.
 * Options are shuffled per attempt and an attempt starts with nothing
 * chosen, as today's PracticeMCQText. Selection follows selectionModeFor:
 * template 1 is single-select (a tap replaces the choice; radios), template
 * 3 toggles (several may be chosen; checkboxes). Grading is unchanged.
 */
export default function McqTextBody({
  question,
  tries,
  resetKey,
  disabled,
  marks,
  showAnswer,
  report,
  layout,
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

  const mode = useMemo(
    () => selectionModeFor(Number(question?.templatetypeid), question),
    [question],
  );
  const roles = selectionRoles(mode);

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
  // The question's picture: 220 as designed, smaller on a short screen so
  // the options stay in view.
  const fileHeight = layout?.compact ? 120 : 220;

  // A short screen: as many columns as fit the measured width, and denser
  // cards, so the options stay above the footer (and the result strip).
  const COMPACT_GAP = 10;
  const compactWidth =
    layout?.compact === true
      ? (() => {
          const trailing = anyAudio ? OPTION_AUDIO_SIZE + 8 : 0;
          const cols = compactColumns(
            options.length,
            layout.availableWidth,
            COMPACT_GAP,
            trailing,
          );
          return (layout.availableWidth - COMPACT_GAP * (cols - 1)) / cols;
        })()
      : null;

  return (
    <View style={{ rowGap: compactWidth != null ? 10 : 16 }}>
      {!_.isEmpty(fileSource) ? (
        <View style={{ height: fileHeight }}>
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
        role={roles.group}
        style={
          compactWidth != null
            ? {
                flexDirection: 'row',
                flexWrap: 'wrap',
                columnGap: COMPACT_GAP,
                rowGap: COMPACT_GAP,
              }
            : isGrid
              ? { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 14 }
              : { rowGap: 12 }
        }>
        {options.map((item, index) => (
          <McqTextOption
            key={item.questionoptionid}
            option={item}
            index={index}
            grid={isGrid}
            width={compactWidth}
            reserveAudio={anyAudio}
            selectionRole={roles.option}
            state={mcqOptionState(item, {
              selected: !_.isEmpty(selections[item.questionoptionid]),
              marks,
              showAnswer,
            })}
            disabled={disabled}
            showAnswer={showAnswer}
            onPress={() =>
              setSelections(s =>
                selectOption(s, item.questionoptionid, item, mode),
              )
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
  width,
  reserveAudio,
  selectionRole,
  state,
  disabled,
  showAnswer,
  onPress,
}: {
  option: QuestionOption;
  index: number;
  grid: boolean;
  /** Compact: the measured width of this option's cell; else null. */
  width: number | null;
  reserveAudio: boolean;
  selectionRole: 'radio' | 'checkbox';
  state: ReturnType<typeof mcqOptionState>;
  disabled: boolean;
  showAnswer: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const resultKey = mcqResultLabelKey(state, showAnswer);
  const audio = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option.questionoptionid],
  );
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
        width != null
          ? { width }
          : grid
            ? { flexBasis: '45%', flexGrow: 1, maxWidth: '50%' }
            : null,
      ]}>
      <View style={{ flex: 1 }}>
        <QuizOption
          testID={`answer-option-${index}`}
          label={option.questionoptiontext}
          state={state}
          disabled={disabled}
          onPress={onPress}
          selectionRole={selectionRole}
          dense={width != null}
          // After a result the name says so, as the picture choice does.
          accessibilityLabel={
            resultKey ? t(resultKey, { label: option.questionoptiontext }) : undefined
          }
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
