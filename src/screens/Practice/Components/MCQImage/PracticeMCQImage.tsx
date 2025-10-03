import { useTheme } from 'styled-components/native';
import { PracticeProps } from '../../PracticeScreen';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useScreenDimension } from '@/services';
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
import _ from 'lodash';
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
      onRetry = () => undefined,
      onSubmit = () => undefined,
    }: PracticeProps,
    ref,
  ) {
    const theme = useTheme();
    const { unblockHeightWithoutHeader } = useScreenDimension();

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

      onSubmit(attempt.tries, isCorrect);
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

    const renderQuestionOption = ({ item }: { item: QuestionOption }) => {
      return (
        <MCQImageItem
          option={item}
          isSelected={!_.isEmpty(attempt.selections[item.questionoptionid])}
          isShowingAnswer={isShowingAnswer}
          onPress={() => handleItemPress(item)}
        />
      );
    };

    const renderItemSeparation = () => <SizedBox.Large width />;

    return (
      <Container
        containerHeight={unblockHeightWithoutHeader}
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
          style={{ marginHorizontal: theme.layouts.large }}>
          <FlatList
            style={{ flex: 1 }}
            data={options}
            contentContainerStyle={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
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
        />
      </Container>
    );
  },
);
