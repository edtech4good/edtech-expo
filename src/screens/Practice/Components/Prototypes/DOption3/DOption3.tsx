import { PracticeHandler, QuestionHeading } from '@/models';
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { PracticeProps } from '../../../PracticeScreen';
import { useTheme } from 'styled-components/native';
import { useScreenDimension } from '@/services';
import {
  Column,
  Container,
  ExpandedWithLayout,
  H1,
  PracticeFooter,
  PracticeHeading,
  Row,
  SizedBox,
} from '@/components';
import _ from 'lodash';
import Option3Item from './components/Option3Item';
import Option3Area from './components/Option3Area';
import { FormProvider, useForm } from 'react-hook-form';

export default forwardRef<PracticeHandler, PracticeProps>(function DOption3(
  {
    onRetry = () => undefined,
    onSubmit = () => undefined,
    question,
    currentQuestionIndex,
    maxQuestion,
  },
  ref,
) {
  const theme = useTheme();
  const { unblockHeightWithoutHeader } = useScreenDimension();

  useImperativeHandle(
    ref,
    () => {
      return {
        retry() {},
        submit() {},
      };
    },
    [],
  );
  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []),
    [question, currentQuestionIndex],
  );

  const methods = useForm<{
    tries: number;
    answers: Record<string, number>;
    isSelecting: boolean;
  }>({
    defaultValues: {
      tries: 1,
      answers: {},
      isSelecting: false,
    },
  });

  useEffect(() => {
    methods.reset();
  }, [currentQuestionIndex]);

  const handleAreaPress = (key: string) => {
    const isSelecting = methods.getValues('isSelecting');
    // Decrease?
    if (!isSelecting) return;

    const currentValue = methods.getValues('answers');
    // console.log('VALLLL : ', currentValue[key]);
    methods.setValue('answers', {
      ...currentValue,
      [key]: (currentValue[key] ?? 0) + 1,
    });
  };

  const handleSubmit = (data: {
    tries: number;
    answers: Record<string, number>;
    isSelecting: boolean;
  }) => {
    console.log('Data: ', data);

    if (_.isEmpty(data.answers)) return;
    const isCorrect = _.reduce(
      data.answers,
      (result, value, key) => {
        console.log('Key: ', key);
        if (
          questionOptions[key as string].questionoptionvalue !==
          data.answers[key]
        )
          result = false;
        return result;
      },
      true,
    );

    onSubmit(data.tries, isCorrect);
  };

  const handleRetry = () => {
    const currentTries = methods.getValues('tries');
    methods.reset();
    methods.setValue('tries', currentTries + 1);
  };

  const renderBottomRow = () => {
    return _.map(questionOptions, (qpt, index) => {
      if (!_.isNumber(qpt.questionoptionvalue))
        return <H1 key={`${index}`}>{` ${qpt.questionoptiontext} `}</H1>;

      return (
        <Option3Area
          key={`${index}`}
          name={`answers.${index}`}
          questionItem={_.get(question, 'questionobject.questionfile')}
          option={qpt}
          onPress={() => handleAreaPress(`${index}`)}
        />
      );
    });
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
      <ExpandedWithLayout
        flexDirection="row"
        borderRadius={theme.layouts.defaultRadius}
        backgroundColor={theme.colors.surface}
        justifyContent="center"
        alignItems="center"
        style={{ marginHorizontal: theme.layouts.large }}>
        <Column justifyContent="space-around" alignItems="flex-start">
          <Option3Item
            question={question}
            onToggle={val => {
              methods.setValue('isSelecting', val);
            }}
          />
          <Row justifyContent="center">
            <FormProvider {...methods}>{renderBottomRow()}</FormProvider>
          </Row>
        </Column>
      </ExpandedWithLayout>
      <SizedBox.Large height />
      <PracticeFooter
        currentQuestionIndex={currentQuestionIndex}
        maxQuestion={maxQuestion}
        onSubmit={methods.handleSubmit(handleSubmit)}
        onRetry={handleRetry}
      />
    </Container>
  );
});
