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

export default forwardRef<PracticeHandler, PracticeProps>(function FOption1(
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

  useImperativeHandle(ref, () => {
    return {
      retry() {},
      submit() {},
    };
  });
  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []),
    [question, currentQuestionIndex],
  );

  const exerciseImage = useResource(
    { name: _.get(question, 'questionobject.questionfile.filename', '') },
    [question, currentQuestionIndex],
  );

  const methods = useForm<UserFillBlankAttept>({
    defaultValues: useMemo(
      () => ({
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
      }),
      [currentQuestionIndex],
    ),
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
    // methods.resetField('tries');
  }, [currentQuestionIndex, question]);

  const displayText = useMemo(() => {
    if (_.isEmpty(question.questiontext)) return '';
    const splittedText = question.questiontext.split('-----');
    if (!question.questiontext) return '';
    return _.map(splittedText, (st, index) => {
      if (index === 0) return st;
      const qOption = questionOptions[index - 1];
      return (
        <H3 key={qOption.questionoptionid}>
          {'  '}
          <FormInput name={`selections.${qOption.questionoptionid}.answer`} />
          {'  '}
          {st}
        </H3>
      );
    });
  }, [currentQuestionIndex, question]);

  const handleSubmit = (data: UserFillBlankAttept) => {
    const isCorrect = _.reduce(
      data.selections,
      (result, value) => {
        if (value.answer !== value.option.questionoptiontext) result = false;
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
          style={{ marginHorizontal: theme.layouts.large }}
          backgroundColor={theme.colors.surface}
          borderRadius={theme.layouts.defaultRadius}
          justifyContent="center">
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
