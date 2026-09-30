import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useMCQImageBreakpointSize } from '@/components/practices/MCQImageItem';
import type { QuestionBodyProps } from '../types';
import { useReportAnswer } from '../useReportAnswer';
import ImageChoiceCard from './ImageChoiceCard';
import {
  evaluateMcqImage,
  imageOptionState,
  indicatorKind,
  isChecked,
  planImageGrid,
  planWidth,
  selectionModeFor,
  selectionRoles,
  selectOption,
} from './imageChoiceLogic';

/**
 * Multiple choice, pictures (templates 2 and 4), for CorporateQuestionShell.
 * Options are shuffled per attempt (keyed on `tries`) and an attempt starts
 * with nothing chosen, as today's PracticeMCQImage. Selection follows
 * selectionModeFor: template 2 is single-select (a tap replaces the choice;
 * radios), template 4 toggles (several may be chosen; checkboxes), and a
 * template 2 question with more than one correct option keeps multiple
 * selection so it stays answerable. Grading is the shared rule, so for the
 * same final selection `iscorrect` and the answer are what the kids renderer
 * sends.
 *
 * Layout: sized from the shell's measured `layout` (never the window). A 2x2
 * of square pictures with captions under them; on a phone on its side
 * (`layout.compact`) one row with captions on the pictures, down to
 * COMPACT_MIN_TILE (56) points; a tiny picture (under 64) drops its caption.
 * `layout.availableHeight` drops by the result strip after Submit (less the
 * room the clamped question card gives back), so the grid refits and the
 * learner's own mark is never behind the strip. The grid renders hidden
 * until the shell has measured, so nothing jumps.
 */
export default function McqImageBody({
  question,
  tries,
  resetKey,
  disabled,
  marks,
  showAnswer,
  report,
  layout,
}: QuestionBodyProps) {
  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  // Reshuffled per attempt, as today (keyed on tries).
  const options = useMemo(() => _.shuffle(questionOptions), [tries, questionOptions]);

  const mode = useMemo(
    () => selectionModeFor(Number(_.get(question, 'templatetypeid')), question),
    [question],
  );
  const roles = selectionRoles(mode);

  const [selections, setSelections] = useState<Record<string, QuestionOption>>({});
  // Retry / Try again clear the answer; so does Show answer (as today).
  useEffect(() => {
    setSelections({});
  }, [resetKey, showAnswer]);

  // Multiple choice can always be submitted: today an empty answer grades as wrong.
  useReportAnswer(report, true, () => evaluateMcqImage(questionOptions, selections));

  const breakpointSize = useMCQImageBreakpointSize();
  const plan = planImageGrid({ count: options.length, breakpointSize, layout });

  return (
    <View style={{ opacity: layout === null ? 0 : 1 }}>
      <View
        role={roles.group}
        style={{
          width: planWidth(plan),
          maxWidth: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: plan.gap,
          rowGap: plan.gap,
        }}>
        {options.map((item, index) => {
          const selected = isChecked(selections, item.questionoptionid);
          return (
            <ImageChoiceCard
              key={item.questionoptionid}
              option={item}
              index={index}
              count={options.length}
              side={plan.side}
              frame={plan.frame}
              compact={plan.compact}
              indicator={indicatorKind(mode)}
              role={roles.option}
              selected={selected}
              showAnswer={showAnswer}
              state={imageOptionState(item, { selected, marks, showAnswer })}
              disabled={disabled}
              onPress={() =>
                setSelections(s => selectOption(s, item.questionoptionid, item, mode))
              }
            />
          );
        })}
      </View>
    </View>
  );
}
