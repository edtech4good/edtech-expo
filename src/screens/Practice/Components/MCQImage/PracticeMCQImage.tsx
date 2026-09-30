import { useTheme } from 'styled-components/native';
import { PracticeProps } from '../../PracticeScreen';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useDesign } from '@/services';
import {
  Container,
  Expanded,
  H3,
  MCQImageItem,
  PracticeHeading,
  Row,
  SizedBox,
  PracticeFooter,
} from '@/components';
import { FlatList } from 'react-native';
import { useMCQImageBreakpointSize } from '@/components/practices/MCQImageItem';
import {
  choiceTileReserve,
  imageTileSize,
  tileRowContentStyle,
} from './layout';
import _ from 'lodash';
import { choiceAnswer } from '@/utils/answerV1';
import { KeyExtractorHelper } from '@/utils';
import {
  PracticeAttempt,
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
} from '@/models';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeMCQImage(
    {
      question,
      currentQuestionIndex,
      maxQuestion,
      hideRetry = false,
      onRetry = () => undefined,
      onSubmit = () => undefined,
    }: PracticeProps,
    ref,
  ) {
    const theme = useTheme();
    const { isCorporate } = useDesign();
    // Height the answer box really has, measured by onLayout. The tile is
    // sized from it (see imageTileSize), so the question, box and Submit fit
    // whatever the screen spends on header, safe areas or a wrapped question.
    // Until the first measurement the tiles are hidden (opacity 0, still laid
    // out) rather than drawn at the wrong size and then jumping.
    const breakpointSize = useMCQImageBreakpointSize();
    const [boxHeight, setBoxHeight] = useState<number | null>(null);
    const tileSize =
      boxHeight === null
        ? breakpointSize
        : imageTileSize({
            breakpointSize,
            available: boxHeight - choiceTileReserve(theme.layouts),
          });

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetryPress(true);
          },
          submit() {},
          revealAnswer() {
            setAttempt(val => ({ ...val, selections: {} }));
            setIsShowingAnswer(true);
          },
        };
      },
      [currentQuestionIndex],
    );

    const [attempt, setAttempt] = useState<PracticeAttempt>({
      tries: 1,
      selections: {},
    });

    const questionOptions = useMemo(
      () => _.get(question, 'questionobject.questionoptions'),
      [question],
    );

    const options = useMemo(
      () => _.shuffle(questionOptions),
      [attempt.tries, question],
    );

    const [isShowingAnswer, setIsShowingAnswer] = useState<boolean>(false);

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
      const { isCorrect } = _.reduce(
        questionOptions,
        (result, value) => {
          console.log(`===== ${value.questionoptiontext} =====`);
          console.log(
            'Is selected? ',
            !_.isEmpty(attempt.selections[value.questionoptionid]),
          );
          console.log('Is correct? ', value.questionoptioniscorrect);
          if (
            value.questionoptioniscorrect &&
            _.isEmpty(attempt.selections[value.questionoptionid])
          )
            result.isCorrect = false;
          else if (
            !value.questionoptioniscorrect &&
            !_.isEmpty(attempt.selections[value.questionoptionid])
          )
            result.isCorrect = false;
          return result;
        },
        {
          isCorrect: true,
        },
      );

      onSubmit(
        attempt.tries,
        isCorrect,
        false,
        choiceAnswer(_.keys(_.pickBy(attempt.selections, v => !_.isEmpty(v)))),
      );
    };

    const handleRetryPress = (chargeAttempt = false) => {
      setAttempt(val => ({
        ...val,
        tries: chargeAttempt ? val.tries + 1 : val.tries,
        selections: {},
      }));
      // onRetry();
    };

    const handleItemPress = (qp: QuestionOption) => {
      const isSelected = !_.isEmpty(attempt.selections[qp.questionoptionid]);
      if (isSelected) {
        const oldSelection = attempt.selections;
        delete oldSelection[qp.questionoptionid];
        setAttempt(val => ({ ...val, selections: oldSelection }));
      } else {
        setAttempt(val => ({
          ...val,
          selections: { ...attempt.selections, [qp.questionoptionid]: qp },
        }));
      }
    };

    const renderQuestionOption = ({
      item,
      index,
    }: {
      item: QuestionOption;
      index: number;
    }) => {
      return (
        <MCQImageItem
          option={item}
          isSelected={!_.isEmpty(attempt.selections[item.questionoptionid])}
          isShowingAnswer={isShowingAnswer}
          size={tileSize}
          index={index}
          onPress={() => handleItemPress(item)}
        />
      );
    };

    const renderItemSeparation = () => <SizedBox.Large width />;

    return (
      <Container
        fill
        paddingLeft={theme.layouts.large}
        paddingRight={theme.layouts.large}>
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
          flexDirection="row"
          justifyContent="center"
          borderRadius={theme.layouts.defaultRadius}
          backgroundColor={theme.colors.surface}
          onLayout={e => setBoxHeight(e.nativeEvent.layout.height)}
          style={{
            marginHorizontal: theme.layouts.large,
            ...(isCorporate
              ? { borderWidth: 1, borderColor: theme.colors.divider }
              : null),
          }}>
          <FlatList
            style={{ flex: 1, opacity: boxHeight === null ? 0 : 1 }}
            extraData={tileSize}
            data={options}
            contentContainerStyle={tileRowContentStyle(theme.layouts)}
            centerContent
            renderItem={renderQuestionOption}
            ItemSeparatorComponent={renderItemSeparation}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={KeyExtractorHelper}
          />
        </Expanded>
        <SizedBox.Large height />
        <PracticeFooter
          isShowingAnswer={isShowingAnswer}
          currentQuestionIndex={currentQuestionIndex}
          maxQuestion={maxQuestion}
          onSubmit={handleSubmit}
          onRetry={handleRetryPress}
          hideRetry={hideRetry}
        />
      </Container>
    );
  },
);
