import {
  FractionAttempt,
  FractionAttemptAnswer,
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
} from '@/models';
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { PracticeProps } from '../../PracticeScreen';
import { useTheme } from 'styled-components/native';
import {
  ChildImage,
  Container,
  Expanded,
  ExpandedWithLayout,
  H2,
  PracticeFooter,
  PracticeHeading,
  SizedBox,
} from '@/components';
import { useResource, useScreenDimension } from '@/services';
import _ from 'lodash';
import FractionItem from './Components/FractionItem';
import { FormProvider, useForm } from 'react-hook-form';

interface FractionProps {
  numeratorValue: string;
  numeratorIsStatic?: boolean;

  denominatorValue?: string;
  denomiatorIsStatic?: boolean;

  isFraction: boolean;
  isText?: boolean;
}

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeFraction(
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

    const questionOptions = useMemo(
      () =>
        _.isString(question.questionoptions)
          ? _.get(question, 'questionobject.questionoptions', [])
          : question.questionoptions,
      [question, currentQuestionIndex],
    );

    const methods = useForm<FractionAttempt>({
      defaultValues: useMemo(
        () => ({
          tries: 1,
          selections: _.reduce(
            questionOptions,
            (result, value) => {
              if (!value) return result;
              if (value.questionoptionistext) return result;
              result[value.questionoptionid] = {
                option: value,
                answer: {
                  denominatorAnswer:
                    value.questionoptiondenominatorisstatic === true
                      ? value.questionoptiondenominatorvalue
                      : '',
                  numeratorAnswer:
                    value.questionoptionnumeratorisstatic === true
                      ? value.questionoptionnumeratorvalue
                      : '',
                },
              };
              return result;
            },
            {} as Record<string, FractionAttemptAnswer>,
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
            if (value.questionoptionistext) return result;
            result[value.questionoptionid] = {
              option: value,
              answer: {
                denominatorAnswer:
                  value.questionoptiondenominatorisstatic === true
                    ? value.questionoptiondenominatorvalue
                    : '',
                numeratorAnswer:
                  value.questionoptionnumeratorisstatic === true
                    ? value.questionoptionnumeratorvalue
                    : '',
              },
            };
            return result;
          },
          {} as Record<string, FractionAttemptAnswer>,
        ),
      });
    }, [currentQuestionIndex]);

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetryPress();
          },
          submit() {},
        };
      },
      [],
    );

    const exerciseImage = useResource(
      { name: _.get(question, 'questionobject.questionfile.filename', '') },
      [question, currentQuestionIndex],
    );

    const handleRetryPress = () => {};
    const handleSubmit = (data: FractionAttempt) => {
      // console.log('DATA: ', data);

      // return;
      const isCorrect = _.reduce(
        data.selections,
        (result, value) => {
          if (value.option.questionoptionistext) return result;
          if (
            !value.option.questionoptionnumeratorisstatic &&
            value.option.questionoptionnumeratorvalue !==
              value.answer.numeratorAnswer
          )
            result = false;

          if (
            value.option.questionoptionisfraction &&
            !value.option.questionoptiondenominatorisstatic &&
            value.option.questionoptiondenominatorvalue !==
              value.answer.denominatorAnswer
          )
            result = false;
          return result;
        },
        true,
      );

      // console.log('The answer is correct : ', isCorrect);
      onSubmit(data.tries, isCorrect);
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
        <Expanded
          flexDirection="row"
          justifyContent="center"
          borderRadius={theme.layouts.defaultRadius}
          backgroundColor={theme.colors.surface}
          style={{ margin: theme.layouts.large }}>
          {!_.isEmpty(exerciseImage) && (
            <ExpandedWithLayout justifyContent="center" alignItems="center">
              <ChildImage source={exerciseImage} />
            </ExpandedWithLayout>
          )}
          <FormProvider {...methods}>
            <FractionItem
              currentQuestionIndex={currentQuestionIndex}
              options={questionOptions}
            />
          </FormProvider>
        </Expanded>
        <PracticeFooter
          currentQuestionIndex={currentQuestionIndex}
          maxQuestion={maxQuestion}
          onSubmit={methods.handleSubmit(handleSubmit)}
          onRetry={handleRetryPress}
        />
      </Container>
    );
  },
);
