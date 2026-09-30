import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, View, useWindowDimensions } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useMCQImageBreakpointSize } from '@/components/practices/MCQImageItem';
import type { QuestionBodyProps } from '../types';
import { useReportAnswer } from '../useReportAnswer';
import ImageChoiceCard from './ImageChoiceCard';
import {
  availableGridHeight,
  evaluateMcqImage,
  FOOTER_RESERVE,
  GRID_GAP,
  imageOptionState,
  isMultiTemplate,
  planImageGrid,
  planWidth,
  toggleSelection,
} from './imageChoiceLogic';

/**
 * Multiple choice, pictures (templates 2 and 4), for CorporateQuestionShell.
 * Behaviour is today's PracticeMCQImage: options are shuffled per attempt,
 * tapping toggles an option (several may be chosen on BOTH templates: today
 * template 2 does not limit the answer to one), and an attempt starts with
 * nothing chosen. Grading is the shared rule, so `iscorrect` and the answer
 * are what the kids renderer sends for the same taps.
 *
 * Layout: a two-column grid of square pictures (a 2x2 for four options),
 * centred in the 760 column. The picture side is the breakpoint size clamped
 * to the measured grid width and to the height left below the question (see
 * planImageGrid); there is no minHeight, and the footer with Submit sits
 * outside the scrolling page, so it is always visible.
 */
export default function McqImageBody({
  question,
  tries,
  resetKey,
  disabled,
  marks,
  showAnswer,
  report,
}: QuestionBodyProps) {
  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  // Reshuffled per attempt, as today (keyed on tries).
  const options = useMemo(() => _.shuffle(questionOptions), [tries, questionOptions]);
  const multi = isMultiTemplate(_.get(question, 'templatetypeid'));

  const [selections, setSelections] = useState<Record<string, QuestionOption>>({});
  // Retry / Try again clear the answer; so does Show answer (as today).
  useEffect(() => {
    setSelections({});
  }, [resetKey, showAnswer]);

  // Multiple choice can always be submitted: today an empty answer grades as wrong.
  useReportAnswer(report, true, () => evaluateMcqImage(questionOptions, selections));

  // Measured space: the grid's width (onLayout), and where the body starts in
  // the window (measureInWindow), so the tiles fit what is left.
  const breakpointSize = useMCQImageBreakpointSize();
  const { height: windowHeight } = useWindowDimensions();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [bodyTop, setBodyTop] = useState<number | null>(null);
  const rootRef = useRef<View>(null);
  const measureTop = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y)) setBodyTop(y);
    });
  }, []);
  const onGridLayout = (e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width);
    measureTop();
  };
  const availableHeight =
    bodyTop === null
      ? null
      : availableGridHeight({
          windowHeight,
          bodyTop,
          bottomReserve: FOOTER_RESERVE + tabBarHeight,
        });
  const plan = planImageGrid({
    count: options.length,
    breakpointSize,
    gridWidth,
    availableHeight,
  });

  return (
    <View ref={rootRef} collapsable={false}>
      <View onLayout={onGridLayout} style={{ opacity: gridWidth === null ? 0 : 1 }}>
      <View
        role={multi ? 'group' : 'radiogroup'}
        style={{
          width: planWidth(plan),
          maxWidth: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: GRID_GAP,
          rowGap: GRID_GAP,
        }}>
        {options.map((item, index) => (
          <ImageChoiceCard
            key={item.questionoptionid}
            option={item}
            index={index}
            count={options.length}
            side={plan.side}
            multi={multi}
            showAnswer={showAnswer}
            state={imageOptionState(item, {
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
    </View>
  );
}
