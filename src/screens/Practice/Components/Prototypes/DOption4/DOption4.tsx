import { Images } from '@/assets';
import {
  ChildImage,
  Container,
  Expanded,
  ExpandedWithLayout,
  PracticeFooter,
  PracticeHeading,
  Row,
  SizedBox,
  StackImage,
} from '@/components';
import {
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
  ShakingHandler,
} from '@/models';
import { PracticeProps } from '@/screens/Practice/PracticeScreen';
import { useResource, useScreenDimension } from '@/services';
import { Image, ImageSource } from 'expo-image';
import _ from 'lodash';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useTheme } from 'styled-components/native';
import DOption4Area from './components/DOption4Area';
import { FormProvider, useForm } from 'react-hook-form';
import DOption4Item from './components/DOption4Item';
import { FlatList } from 'react-native';
import numeral from 'numeral';

interface DOption4Attempt {
  tries: number;
  answers: Record<
    string,
    { id: string; option: QuestionOption; value: number }
  >;
  currentOption: { id: string; option: QuestionOption } | undefined;
}

export default forwardRef<PracticeHandler, PracticeProps>(function DOption4(
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

  const matchingItemRefs = useRef<Record<string, ShakingHandler>>({});

  const methods = useForm<DOption4Attempt>({
    defaultValues: {
      tries: 1,
      answers: {},
      currentOption: undefined,
    },
  });

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

  useEffect(() => {
    methods.reset();
  }, [currentQuestionIndex]);

  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions'),
    [question, currentQuestionIndex],
  );

  const source = useResource(
    { name: _.get(question, 'questionobject.questionfile.filename', '') },
    [currentQuestionIndex],
  );

  const handleItemPress = (id: string, option: QuestionOption) => {
    if (!matchingItemRefs.current) return;
    const currentOption = methods.getValues('currentOption');
    if (currentOption?.id != id) {
      if (!_.isEmpty(currentOption))
        matchingItemRefs.current[currentOption.id].stop();
      matchingItemRefs.current[id].shake();
      methods.setValue('currentOption', { id, option });
    } else {
      methods.setValue('currentOption', undefined);
      matchingItemRefs.current[id].stop();
    }
  };

  const handleAreaPress = () => {
    const currentOption = methods.getValues('currentOption');
    if (_.isEmpty(currentOption)) return;
    // {}
    const currentAnswers = methods.getValues('answers');
    const currentOptionAnswer = currentAnswers[currentOption.id];
    console.log('Current Option Answer: ', currentOptionAnswer);
    methods.setValue('answers', {
      ...currentAnswers,
      [currentOption.id]: {
        ...(currentOptionAnswer || {
          id: currentOption.id,
          option: currentOption.option,
        }),
        value: _.get(currentOptionAnswer, 'value', 0) + 1,
      },
    });
  };

  const handleSubmit = async (data: DOption4Attempt) => {
    console.log('Data: ', data);
    const { tries, answers } = data;

    const totalValue = _.reduce(
      answers,
      (result, value) => {
        console.log(`===== ${value.option.questionoptionvalue} =====`);
        console.log('Multiplier: ', value.value);
        const optionTotalValue = numeral(value.option.questionoptionvalue ?? 0)
          .multiply(value.value)
          .value();
        console.log('OptionTotal: ', optionTotalValue);
        result = numeral(result).add(optionTotalValue).value() ?? 0;
        return result;
      },
      0,
    );

    const isCorrect = `${totalValue}` === `${question.questioncorrectvalue}`;

    onSubmit(tries, isCorrect);
  };
  const handleRetry = () => {
    methods.setValue('tries', methods.getValues('tries') + 1);
    methods.setValue('answers', {});
    methods.setValue('currentOption', undefined);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: QuestionOption;
    index: number;
  }) => {
    // return _.map(questionOptions, (qp, index) => (
    return (
      <DOption4Item
        key={`${item.questionoptionid}`}
        id={`${index}`}
        source={_.get(item, 'questionoptionfile.filename', '')}
        ref={r => {
          if (!r) return;
          matchingItemRefs.current[`${index}`] = r;
        }}
        onPress={() => handleItemPress(`${index}`, item)}
      />
    );
    // ));
  };

  const renderItemSeparator = () => <SizedBox.Large width />;

  const renderItemList = () => {
    return (
      <FlatList
        style={{ flex: 1, alignSelf: 'stretch' }}
        contentContainerStyle={{ padding: theme.layouts.large }}
        data={questionOptions}
        renderItem={renderItem}
        ItemSeparatorComponent={renderItemSeparator}
        horizontal
        showsHorizontalScrollIndicator={false}
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
      <FormProvider {...methods}>
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
          <ExpandedWithLayout>
            <Row>{renderItemList()}</Row>
            <ExpandedWithLayout
              style={{
                // marginHorizontal: theme.layouts.large,
                borderRadius: theme.layouts.defaultRadius,
              }}
              backgroundColor={theme.colors.surface}>
              <DOption4Area onPress={handleAreaPress} />
            </ExpandedWithLayout>
          </ExpandedWithLayout>
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
