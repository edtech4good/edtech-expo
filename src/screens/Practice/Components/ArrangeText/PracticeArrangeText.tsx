import {
  ArrangeTextAttempt,
  DraggableHandler,
  DraggableProps,
  DropAreaProps,
  EdgeOffset,
  Offset,
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
} from '@/models';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PracticeProps } from '../../PracticeScreen';
import { useTheme } from 'styled-components/native';
import { useResource, useScreenDimension } from '@/services';
import {
  ArrangeItem,
  Container,
  Expanded,
  H4,
  H5,
  PracticeHeading,
  Row,
  SizedBox,
  PracticeFooter,
  ExpandedWithLayout,
  ChildImage,
  ArrangeTextArea,
  FillBlankItem,
} from '@/components';
import _ from 'lodash';
import { Image } from 'expo-image';
import { isPointInRect, KeyExtractorHelper } from '@/utils';
import { FlatList } from 'react-native';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeArrangeText(
    {
      onRetry = () => undefined,
      onSubmit = () => undefined,
      question,
      currentQuestionIndex,
      maxQuestion,
    }: PracticeProps,
    ref,
  ) {
    const theme = useTheme();
    const { unblockHeightWithoutHeader, windowWidth } = useScreenDimension();
    const matchingItemRefs = useRef<Record<string, DraggableHandler>>({});
    const source = useResource(
      { name: _.get(question, 'questionobject.questionfile.filename', '') },
      [currentQuestionIndex],
    );

    console.log('Source is : ', source);
    const [dropAreaPos, setDropAreaPos] = useState<EdgeOffset | undefined>(
      undefined,
    );
    const [attempt, setAttempt] = useState<ArrangeTextAttempt>({
      tries: 1,
      // selections: {},
      selections: [],
    });

    const options = useMemo(
      () => _.shuffle(_.get(question, 'questionobject.questionoptions', [])),
      [question],
    );

    const [isShowingAnswer, setIsShowingAnswer] = useState<boolean>(false);

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetry(true);
          },
          submit() {},
          revealAnswer() {
            handleRevealAnswer();
          },
        };
      },
      [currentQuestionIndex],
    );

    useEffect(() => {
      console.log('USE EFFECT CALLED');
      setAttempt({ tries: 1, selections: [] });
      setIsShowingAnswer(false);
    }, [currentQuestionIndex]);

    const handleSubmit = () => {
      // onSubmit(1, true);
      if (isShowingAnswer) {
        onSubmit(attempt.tries, false, true);
        return;
      }
      let isCorrect = true;
      if (Object.values(attempt.selections).length !== options.length)
        isCorrect = false;
      else {
        const answers = Object.values(attempt.selections);

        const { correct } = _.reduce(
          answers,
          (result, value, index) => {
            // if (value.questionoptionsequence > answers[index + 1] && !_.isEmpty(answers[index + 1])) result = false;

            console.log('Current Seq: ', value.questionoptionsequence);
            console.log('Seq: ', result.currentSequence);
            if (value.questionoptionsequence < result.currentSequence)
              result.correct = false;
            result.currentSequence = value.questionoptionsequence;
            return result;
          },
          { correct: true, currentSequence: 0 },
        );
        isCorrect = correct;
      }

      onSubmit(attempt.tries, isCorrect);
      // console.log('I AM CORRECT? : ', isCorrect);
    };

    const handleRetry = (chargeAttempt = false) => {
      // _.forEach(options, opt => {
      //   matchingItemRefs.current[opt.questionoptionid].resetPosition();
      // });
      setAttempt(val => ({
        tries: chargeAttempt ? val.tries + 1 : val.tries,
        selections: [],
      }));
    };

    const handleDropAreaLayout = (val: DropAreaProps) => {
      console.log('DropAreaProps : ', val);
      setDropAreaPos(val.edge);
    };

    const handleDragItemRelease = async (
      val: DraggableProps<QuestionOption>,
    ) => {
      if (!dropAreaPos) return;

      const isOverlapped = isPointInRect(
        val.pointerOffset as Offset,
        dropAreaPos,
      );

      if (isOverlapped)
        await setAttempt(at => ({
          ...at,
          selections: {
            ...at.selections,
            [val.id]: val.value as QuestionOption,
          },
        }));

      await matchingItemRefs.current[val.id].resetPosition();
    };

    const handleRevealAnswer = async () => {
      await setIsShowingAnswer(true);
      await setAttempt(val => ({
        ...val,
        selections: _.sortBy(options, 'questionoptionsequence'),
      }));
    };

    const handleItemPress = (item: QuestionOption) => {
      // if (attempt.selections.length === requiredNumberOfAnswer) return;
      setAttempt(val => ({ ...val, selections: [...val.selections, item] }));
      // console.log(attempt);
    };

    const renderDragItem = ({ item }: { item: QuestionOption }) => {
      return (
        <FillBlankItem
          key={item.questionoptionid}
          option={item}
          selections={attempt.selections}
          onPress={handleItemPress}
          disabled={isShowingAnswer}
        />
      );
    };

    // const renderDragItem = ({ item }: { item: QuestionOption }) => {
    //   return (
    //     <ArrangeItem
    //       ref={r => {
    //         if (!r) return;
    //         matchingItemRefs.current[item.questionoptionid] = r;
    //         r.updateOffset(true);
    //       }}
    //       key={item.questionoptionid}
    //       option={item}
    //       invisible={!_.isEmpty(attempt.selections[item.questionoptionid])}
    //       onRelease={handleDragItemRelease}
    //     />
    //   );
    // };

    return (
      <Container containerHeight={unblockHeightWithoutHeader}>
        <PracticeHeading
          heading={
            _.get(
              question,
              'questionobject.questionheading',
              {},
            ) as QuestionHeading
          }
        />
        <SizedBox.Large height />
        <Expanded
          paddingLeft={theme.layouts.large}
          paddingRight={theme.layouts.large}>
          <Expanded
            flexDirection="row"
            borderRadius={theme.layouts.defaultRadius}
            backgroundColor={theme.colors.surface}
            paddingLeft={theme.layouts.large}
            paddingRight={theme.layouts.large}>
            {!_.isEmpty(source) && (
              <ExpandedWithLayout justifyContent="center">
                <ChildImage
                  source={source}
                  contentFit="contain"
                  fallbacksize={160}
                  relativesize={0.9}
                />
              </ExpandedWithLayout>
            )}
            <ExpandedWithLayout flex={2} justifyContent="center">
              <ArrangeTextArea id={'0'} onLayout={handleDropAreaLayout}>
                {_.isEmpty(attempt.selections) && (
                  <H5 alignSelf="center" color={theme.colors.placeholder}>
                    Select options below
                  </H5>
                )}
                {!_.isEmpty(attempt.selections) &&
                  _.map(attempt.selections, qp => (
                    <H4
                      key={
                        qp.questionoptionid
                      }>{`${qp.questionoptiontext} `}</H4>
                  ))}
              </ArrangeTextArea>
            </ExpandedWithLayout>
          </Expanded>
          <SizedBox.Large height />
          <Row
            style={{
              alignSelf: 'stretch',
              justifyContent: 'center',
            }}>
            {/* {_.map(options, qp => renderDragItem({ item: qp }))} */}

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: theme.layouts.tiny }}
              data={options}
              keyExtractor={KeyExtractorHelper}
              ListHeaderComponent={<SizedBox.Tiny width />}
              renderItem={renderDragItem}
            />
          </Row>
        </Expanded>
        <SizedBox.Large height />
        <PracticeFooter
          isShowingAnswer={isShowingAnswer}
          currentQuestionIndex={currentQuestionIndex}
          maxQuestion={maxQuestion}
          onSubmit={handleSubmit}
          onRetry={handleRetry}
        />
      </Container>
    );
  },
);
