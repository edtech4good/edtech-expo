import {
  FillBlankAttempt,
  PracticeAttempt,
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
import { useResource, useScreenDimension } from '@/services';
import _ from 'lodash';
import {
  ChildImage,
  Container,
  Expanded,
  ExpandedWithLayout,
  FillBlankItem,
  H3,
  H4,
  PracticeFooter,
  PracticeHeading,
  Row,
  SizedBox,
} from '@/components';

import {
  fillInTheBlank,
  fromQuestionDistractorToQuestionOption,
} from '@/transforms';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeFillBlank(
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
    const { unblockHeightWithoutHeader } = useScreenDimension();

    const questionOptions = useMemo(
      () => _.get(question, 'questionobject.questionoptions'),
      [question],
    );

    const source = useResource(
      { name: _.get(question, 'questionobject.questionfile.filename', '') },
      [currentQuestionIndex],
    );

    const [attempt, setAttempt] = useState<FillBlankAttempt>({
      tries: 1,
      selections: [],
    });

    const [isShowingAnswer, setIsShowingAnswer] = useState<boolean>(false);

    const availableOptions = useMemo(
      () => [
        ...fromQuestionDistractorToQuestionOption(
          _.get(question, 'questionobject.questiondistractors', []),
        ),
        ...questionOptions,
      ],
      [question],
    );

    const options = useMemo(
      () => _.shuffle(availableOptions),
      [attempt.tries, availableOptions],
    );

    const requiredNumberOfAnswer = useMemo(
      () => questionOptions.length,
      [question],
    );

    const displayText = useMemo(
      () => fillInTheBlank(question.questiontext, attempt.selections),
      [attempt.selections],
    );

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetry(true);
          },
          submit() {
            handleSubmit();
          },
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

    const handleRevealAnswer = async () => {
      await setIsShowingAnswer(true);
      setAttempt(val => ({
        ...val,
        selections: _.sortBy(options, 'questionoptionsequence'),
      }));
    };

    const handleSubmit = () => {
      if (isShowingAnswer) {
        onSubmit(attempt.tries, false, true);
        return;
      }

      let isCorrect = false;

      if (attempt.selections.length < requiredNumberOfAnswer) isCorrect = false;
      else {
        const { correct } = _.reduce(
          attempt.selections,
          (result, value, index) => {
            console.log('Val : ', value);
            console.log('CurSeq: ', result.currentSequence);

            if (
              (!_.isBoolean(value.questionoptioniscorrect) &&
                questionOptions.length > 1) ||
              !_.isNumber(value.questionoptionsequence)
            ) {
              console.log(`%cCurrent Option is invalid`, 'color:red');
              result.correct = false;
            } else if (value.questionoptionsequence < result.currentSequence) {
              console.log(`%cCurrent Option wrong sequence`, 'color:red');
              result.correct = false;
            } else if (
              !value.questionoptioniscorrect &&
              questionOptions.length > 1
            ) {
              console.log(`%cCurrent Option is wrong`, 'color:red');
              result.correct = false;
            }

            result.currentSequence = value.questionoptionsequence;
            return result;
          },
          {
            correct: true,
            currentSequence: 0,
          },
        );

        isCorrect = correct;
      }

      console.log('FINAL : ', isCorrect);

      onSubmit(attempt.tries, isCorrect);
    };

    const handleRetry = (chargeAttempt = false) => {
      setAttempt(val => ({
        ...val,
        tries: chargeAttempt ? val.tries + 1 : val.tries,
        selections: [],
      }));
      // onRetry();
    };

    const handleItemPress = (item: QuestionOption) => {
      if (attempt.selections.length === requiredNumberOfAnswer) return;
      setAttempt(val => ({ ...val, selections: [...val.selections, item] }));
      console.log(attempt);
    };

    const renderOptionList = () => {
      return _.map(options, op => (
        <FillBlankItem
          key={op.questionoptionid}
          option={op}
          selections={attempt.selections}
          onPress={handleItemPress}
          disabled={isShowingAnswer}
        />
      ));
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
          {!_.isEmpty(question.questionobject.questionfile) && (
            <ExpandedWithLayout
              justifyContent="center"
              style={{ marginRight: theme.layouts.large }}>
              <ChildImage source={source} />
            </ExpandedWithLayout>
          )}
          <Expanded>
            <Expanded
              backgroundColor={theme.colors.surface}
              borderRadius={theme.layouts.defaultRadius}
              justifyContent="center">
              <H3>{displayText}</H3>
            </Expanded>
            <SizedBox.Large height />
            <Row
              style={{
                alignSelf: 'stretch',
                justifyContent: 'center',
              }}>
              {renderOptionList()}
            </Row>
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
