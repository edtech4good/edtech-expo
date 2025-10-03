import {
  Container,
  Expanded,
  MCQTextItem,
  PracticeHeading,
  SizedBox,
  PracticeFooter,
  PracticeFile,
  ExpandedWithLayout,
} from '@/components';
import { PracticeProps } from '../../PracticeScreen';
import { useResource, useScreenDimension } from '@/services';
import { FlatList } from 'react-native';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';
import {
  PracticeAttempt,
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
} from '@/models';
import { KeyExtractorHelper } from '@/utils';

import { Audio } from 'expo-av';

interface MCQTextProps extends PracticeProps {
  multipleChoice?: boolean;
}

export default forwardRef<PracticeHandler, MCQTextProps>(
  function PracticeMCQText(
    {
      onRetry = () => undefined,
      onSubmit = () => undefined,
      question,
      currentQuestionIndex,
      maxQuestion,
      multipleChoice = false,
    }: MCQTextProps,
    ref,
  ) {
    const theme = useTheme();
    const { unblockHeightWithoutHeader } = useScreenDimension();

    const [attempt, setAttempt] = useState<PracticeAttempt>({
      tries: 1,
      selections: {},
    });

    const [isShowingAnswer, setIsShowingAnswer] = useState<boolean>(false);

    const source = useResource(
      { name: _.get(question, 'questionobject.questionfile.filename', '') },
      [currentQuestionIndex],
    );

    const playbackObject = useMemo(() => new Audio.Sound(), []);

    console.log('Current Source is : ', source);

    const questionOptions = useMemo(
      () => _.get(question, 'questionobject.questionoptions'),
      [question],
    );

    const options = useMemo(
      () => _.shuffle(questionOptions),
      [attempt.tries, questionOptions],
    );

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetryPress(true);
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
      setAttempt({ tries: 1, selections: {} });
      setIsShowingAnswer(false);
    }, [currentQuestionIndex]);

    useEffect(() => {
      if (_.isEmpty(source)) return;
      handleLoadAudio();
    }, [source]);

    useEffect(() => {
      setAttempt(val => ({ ...val, selections: {} }));
    }, [isShowingAnswer]);

    const handleLoadAudio = async () => {
      await playbackObject.unloadAsync();
      await playbackObject.loadAsync(
        { uri: source },
        { shouldPlay: false, isLooping: false },
      );
    };

    const handleSubmit = () => {
      if (isShowingAnswer) {
        onSubmit(attempt.tries, false, isShowingAnswer);
        return;
      }
      const { isCorrect } = _.reduce(
        questionOptions,
        (result, value) => {
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

      onSubmit(attempt.tries, isCorrect, isShowingAnswer);
    };

    const handleRetryPress = (chargeAttempt = false) => {
      setAttempt(val => ({
        ...val,
        tries: chargeAttempt ? val.tries + 1 : val.tries,
        selections: {},
      }));
      // onRetry();
    };

    const handleQuestionFilePress = async () => {
      if (_.isEmpty(source)) return;
      await playbackObject.playFromPositionAsync(0);
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

    const handleSingleSelectPress = (qp: QuestionOption) => {};

    const renderItem = ({ item }: { item: QuestionOption }) => {
      return (
        <MCQTextItem
          key={item.questionoptionid}
          text={item.questionoptiontext}
          isSelected={!_.isEmpty(attempt.selections[item.questionoptionid])}
          audioUrl={_.get(item, 'questionoptionfile.filename', '')}
          disabled={isShowingAnswer}
          isShowingAnswer={isShowingAnswer}
          isCorrect={item.questionoptioniscorrect}
          onPress={() => handleItemPress(item)}
        />
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
          flexDirection="row"
          paddingLeft={theme.layouts.large}
          paddingRight={theme.layouts.large}>
          {!_.isEmpty(source) && (
            <ExpandedWithLayout
              backgroundColor={theme.colors.surface}
              justifyContent="center">
              <PracticeFile
                id={question.questionnid}
                file={_.get(question, 'questionobject.questionfile')}
                onPress={handleQuestionFilePress}
              />
            </ExpandedWithLayout>
          )}
          {!_.isEmpty(source) && <SizedBox.Large width />}
          <Expanded flex={1.5}>
            <FlatList
              style={{ flex: 1, width: '100%' }}
              data={options}
              renderItem={renderItem}
              keyExtractor={KeyExtractorHelper}
            />
          </Expanded>
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
