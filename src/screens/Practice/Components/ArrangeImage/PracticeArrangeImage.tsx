import {
  ArrangeImageAttempt,
  ArrangeTextAttempt,
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
} from '@/models';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { PracticeProps } from '../../PracticeScreen';
import { useTheme } from 'styled-components/native';
import { useBreakpoint, useResource, useScreenDimension } from '@/services';
import _ from 'lodash';
import {
  Container,
  Expanded,
  H2,
  H4,
  PracticeFooter,
  PracticeHeading,
  Row,
  SH3,
  SizedBox,
} from '@/components';
import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { changeColorOpacity } from '@/utils';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeArrangeImage(
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

    const [attempt, setAttempt] = useState<ArrangeImageAttempt>({
      tries: 1,
      selections: {},
    });

    const itemWidth = useBreakpoint({
      desktop: 200,
      tablet: 150,
      mobile: 125,
      phablet: 125,
    });

    // const itemWidth = useMemo(() => 200, []);

    const [options, setOptions] = useState(
      _.shuffle(_.get(question, 'questionobject.questionoptions', [])),
    );
    const [indexToSwap, setIndexToSwap] = useState<number | null>(null);
    const [isShowingAnswer, setIsShowingAnswer] = useState<boolean>(false);

    // const matchingItemRefs = useRef<Record<string, DraggableHandler>>({});

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetry(true);
          },
          submit() {},
          revealAnswer() {
            setIsShowingAnswer(true);
          },
        };
      },
      [currentQuestionIndex],
    );

    useEffect(() => {
      console.log('USE EFFECT CALLED');
      setAttempt({ tries: 1, selections: {} });
      setIsShowingAnswer(false);
    }, [currentQuestionIndex]);

    const handleSubmit = () => {
      if (isShowingAnswer) {
        onSubmit(attempt.tries, false, true);
        return;
      }
      let isCorrect = true;
      const answers = Object.values(attempt.selections);

      const { correct } = _.reduce(
        options,
        (result, value, index) => {
          console.log('Current Seq: ', value.questionoptionsequence);
          console.log('Seq: ', result.currentSequence);
          if (value.questionoptionsequence < result.currentSequence)
            result.correct = false;
          result.currentSequence = value.questionoptionsequence;
          return result;
        },
        { correct: true, currentSequence: 0 },
      );

      onSubmit(attempt.tries, correct);
    };

    const handleRetry = (chargeAttempt = false) => {
      setAttempt(val => ({
        tries: chargeAttempt ? val.tries + 1 : val.tries,
        selections: {},
      }));
      setOptions(
        _.shuffle(_.get(question, 'questionobject.questionoptions', [])),
      );
    };

    const handleItemPress = (item: QuestionOption, index: number) => {
      if (!_.isNumber(indexToSwap)) setIndexToSwap(index);
      else {
        const newOptions = [...options];
        newOptions[indexToSwap] = options[index];
        newOptions[index] = options[indexToSwap];

        setOptions(newOptions);
        setIndexToSwap(null);
      }
    };

    const renderItem = (item: QuestionOption, index: number) => {
      if (!item) return <SizedBox.Large width />;
      const imageSource = useResource(
        { name: _.get(item, 'questionoptionfile.filename', '') },
        [index, item],
      );
      return (
        <Pressable
          key={item.questionoptionid}
          disabled={isShowingAnswer}
          onPress={() => handleItemPress(item, index)}
          style={[
            {
              justifyContent: 'center',
              width: itemWidth + 5,
              height: itemWidth + 5,
              borderRadius: theme.layouts.defaultRadius,
              backgroundColor: theme.colors.surface,
              marginRight: theme.layouts.large,
            },
            indexToSwap === index
              ? {
                  borderWidth: theme.layouts.divider,
                  borderColor: theme.colors.primary,
                }
              : {
                  elevation: 7,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: {
                    width: 0,
                    height: 0,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 7,
                },
          ]}>
          <Image
            focusable={false}
            source={imageSource}
            contentFit="contain"
            style={{
              width: itemWidth,
              height: itemWidth,
              maxWidth: 250,
              maxHeight: 250,
              borderWidth: 5,
              borderRadius: theme.layouts.defaultRadius,
              borderColor: theme.colors.surface,
              overflow: 'hidden',
            }}
          />
          {isShowingAnswer && (
            <Row
              style={{
                backgroundColor: changeColorOpacity(theme.colors.surface, 60),
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                paddingRight: theme.layouts.small,
              }}>
              <H2 alignSelf="flex-start" color={theme.colors.primary}>
                {item.questionoptionsequence}
              </H2>
            </Row>
          )}
        </Pressable>
      );
    };

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
            paddingTop={theme.layouts.large}
            backgroundColor={theme.colors.surface}
            justifyContent="center"
            alignItems="center"
            style={{ flexWrap: 'wrap' }}>
            {_.map(options, (op, index) => renderItem(op, index))}
          </Expanded>
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
