import {
  ChildImage,
  Column,
  CompactKeyboard,
  Container,
  Divider,
  Expanded,
  ExpandedWithLayout,
  H2,
  H4,
  PracticeFooter,
  PracticeHeading,
  Row,
  SizedBox,
} from '@/components';
import { FOptionAttempt, PracticeHandler, QuestionHeading } from '@/models';
import { PracticeProps } from '@/screens/Practice/PracticeScreen';
import { useResource, useScreenDimension } from '@/services';
import _ from 'lodash';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useTheme } from 'styled-components/native';

export default forwardRef<PracticeHandler, PracticeProps>(function FOption2(
  {
    onRetry = () => undefined,
    onSubmit = () => undefined,
    question,
    currentQuestionIndex,
    maxQuestion,
  },
  ref,
) {
  useImperativeHandle(ref, () => {
    return {
      retry() {},
      submit() {},
    };
  });

  const theme = useTheme();
  const { unblockHeightWithoutHeader } = useScreenDimension();

  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions'),
    [question],
  );

  const exerciseImage = useResource(
    { name: _.get(question, 'questionobject.questionfile.filename', '') },
    [question, currentQuestionIndex],
  );

  const [attempt, setAttempt] = useState<FOptionAttempt>({
    tries: 1,
    display: '',
    answer: '',
  });

  useEffect(() => {
    setAttempt({ tries: 1, display: '', answer: '' });
  }, [currentQuestionIndex]);

  const handleSubmit = () => {
    const isCorrect =
      attempt.answer === `${questionOptions[4]?.questionoptionvalue}`;
    onSubmit(attempt.tries, isCorrect);
  };

  const handleRetry = () => {
    setAttempt(val => ({
      ...val,
      tries: val.tries + 1,
      display: '',
      answer: '',
    }));
  };

  const handleDelValue = () => {
    setAttempt(prev => ({
      ...prev,
      display: `${prev.display.slice(0, prev.display.length - 1)}`,
      answer: `${prev.answer.slice(0, prev.answer.length - 1)}`,
    }));
  };

  const handleValueChange = (label: string, val: string) => {
    console.log('Val Pressed : ', val);
    setAttempt(prev => ({
      ...prev,
      display: `${prev.display}${label}`,
      answer: `${prev.answer}${val}`,
    }));
  };

  const renderQuestion = () => {
    return (
      <Row
        alignSelf="center"
        backgroundColor={theme.colors.surface}
        borderRadius={theme.layouts.defaultRadius}
        paddingLeft={theme.layouts.defaultComponentSize}
        paddingRight={theme.layouts.defaultComponentSize}
        paddingBottom={theme.layouts.large}
        paddingTop={theme.layouts.large}
        style={{
          borderWidth: theme.layouts.divider,
          borderColor: theme.colors.outline,
        }}>
        <Column>
          <H2 color={theme.colors.surface}>-</H2>
          <H2>{questionOptions[1]?.questionoptiontext}</H2>
          <Divider color={'transparent'} />
          <H2
            color={theme.colors.surface}
            style={{ minHeight: theme.fontSizes.h4 + theme.layouts.large }}>
            -
          </H2>
        </Column>
        <SizedBox.Small width />
        <Column>
          <H2 alignSelf="flex-end" textAlign="right">
            {questionOptions[0]?.questionoptiontext}
          </H2>
          <H2 alignSelf="flex-end" textAlign="right">
            {questionOptions[2]?.questionoptiontext}
          </H2>
          <Divider color={theme.colors.outline} />
          <H2
            alignSelf="flex-end"
            textAlign="right"
            style={{ minHeight: theme.fontSizes.h4 + theme.layouts.large }}>
            {attempt.display}
          </H2>
        </Column>
      </Row>
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
      <Expanded flexDirection="row" justifyContent="center" alignItems="center">
        {/* {renderEquation()} */}
        {!_.isEmpty(exerciseImage) && (
          <ExpandedWithLayout justifyContent="center" alignItems="center">
            <ChildImage source={exerciseImage} />
          </ExpandedWithLayout>
        )}

        <Expanded justifyContent="center" alignItems="center">
          {renderQuestion()}
          <SizedBox.Large height />
          <SizedBox.Large height />
          <SizedBox.Large height />
          <Row justifyContent="center">
            <CompactKeyboard
              onChange={handleValueChange}
              onDel={handleDelValue}
            />
          </Row>
        </Expanded>
      </Expanded>
      <SizedBox.Large height />
      <PracticeFooter
        currentQuestionIndex={currentQuestionIndex}
        maxQuestion={maxQuestion}
        onSubmit={handleSubmit}
        onRetry={handleRetry}
      />
    </Container>
  );
});
