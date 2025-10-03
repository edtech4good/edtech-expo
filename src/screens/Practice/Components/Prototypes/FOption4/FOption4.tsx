import {
  ChildImage,
  Container,
  Expanded,
  ExpandedWithLayout,
  FormInput,
  H3,
  PracticeFooter,
  PracticeHeading,
  SizedBox,
} from '@/components';
import {
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
  UserFillBlankAttept,
} from '@/models';
import { PracticeProps } from '@/screens/Practice/PracticeScreen';
import { useResource, useScreenDimension } from '@/services';
import _ from 'lodash';
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTheme } from 'styled-components/native';

export default forwardRef<PracticeHandler, PracticeProps>(function FOption4(
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
    () =>
      _.isString(question.questionoptions)
        ? _.get(question, 'questionobject.questionoptions', [])
        : question.questionoptions,
    [question, currentQuestionIndex],
  );

  const exerciseImage = useResource(
    { name: _.get(question, 'questionobject.questionfile.filename', '') },
    [question, currentQuestionIndex],
  );

  const methods = useForm<UserFillBlankAttept>({
    defaultValues: {
      tries: 1,
      selections: _.reduce(
        questionOptions,
        (result, value) => {
          if (!value) return result;
          result[value.questionoptionid] = { option: value, answer: '' };
          return result;
        },
        {} as Record<string, { option: QuestionOption; answer: string }>,
      ),
    },
  });

  useEffect(() => {
    methods.reset({
      tries: 1,
      selections: _.reduce(
        questionOptions,
        (result, value) => {
          if (!value) return result;
          result[value.questionoptionid] = { option: value, answer: '' };
          return result;
        },
        {} as Record<string, { option: QuestionOption; answer: string }>,
      ),
    });
  }, [currentQuestionIndex]);

  const displayText = useMemo(() => {
    if (_.isEmpty(question.questiontext)) return '';
    const splittedText = question.questiontext.split('-----');
    if (!question.questiontext) return '';
    return _.map(splittedText, (st, index) => {
      if (index === 0) return st;
      console.log('Index: ', index);
      console.log(question.questionoptions);
      const qOption = questionOptions[index - 1];
      return (
        <H3 key={qOption.questionoptionid}>
          <FormInput name={`selections.${qOption.questionoptionid}.answer`} />
          {st}
        </H3>
      );
    });
  }, [currentQuestionIndex]);

  const handleSubmit = (data: UserFillBlankAttept) => {
    // console.log('GGG: ', data);

    const isCorrect = _.reduce(
      data.selections,
      (result, value) => {
        if (value.answer !== `${value.option.questionoptionvalue}`)
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
      <FormProvider {...methods}>
        <Expanded
          flexDirection="row"
          backgroundColor={theme.colors.surface}
          borderRadius={theme.layouts.defaultRadius}
          justifyContent="center"
          alignItems="center"
          style={{ margin: theme.layouts.large }}>
          {!_.isEmpty(exerciseImage) && (
            <ExpandedWithLayout justifyContent="center" alignItems="center">
              <ChildImage source={exerciseImage} />
            </ExpandedWithLayout>
          )}
          <Expanded justifyContent="center">
            <H3>{displayText}</H3>
          </Expanded>
        </Expanded>
      </FormProvider>
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
