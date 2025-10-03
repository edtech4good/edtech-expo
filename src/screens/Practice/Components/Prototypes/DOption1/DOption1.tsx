import {
  ChildImage,
  Column,
  Container,
  Expanded,
  ExpandedWithLayout,
  H4,
  H5,
  PracticeFooter,
  PracticeHeading,
  Row,
  SizedBox,
} from '@/components';
import {
  DOption1Attempt,
  PracticeAttempt,
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
} from '@/models';
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
import DOption1Item from './components/DOption1Item';
import { FlatList } from 'react-native';
import { KeyExtractorHelper } from '@/utils';

export default forwardRef<PracticeHandler, PracticeProps>(function DOption1(
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
  const exerciseImage = useResource(
    { name: _.get(question, 'questionobject.questionfile.filename', '') },
    [question],
  );

  const questionOptions = useMemo(
    () =>
      _.isString(question.questionoptions)
        ? _.get(question, 'questionobject.questionoptions', [])
        : question.questionoptions,
    [question, currentQuestionIndex],
  );

  const [attempt, setAttempt] = useState<DOption1Attempt>({
    tries: 1,
    selection: undefined,
  });

  useImperativeHandle(ref, () => {
    return {
      retry() {},
      submit() {},
    };
  });

  useEffect(() => {
    setAttempt({ tries: 1, selection: undefined });
  }, [currentQuestionIndex]);

  const handleSubmit = () => {
    onSubmit(
      attempt.tries,
      attempt.selection?.questionoptioniscorrect ?? false,
    );
  };
  const handleRetry = () => {
    setAttempt(val => ({ ...val, tries: val.tries + 1, selection: undefined }));
  };

  const handleOptionPress = (opt: QuestionOption) => {
    setAttempt(val => ({ ...val, selection: opt }));
  };

  const renderItem = ({ item }: { item: QuestionOption }) => {
    return (
      <DOption1Item
        option={item}
        isSelected={
          _.get(attempt, 'selection.questionoptionid', '') ===
          item.questionoptionid
        }
        onPress={() => handleOptionPress(item)}
      />
    );
  };

  const renderItemSeparation = () => <SizedBox.Large width />;

  const renderOptionList = () => {
    return (
      <FlatList
        style={{
          flex: 1,
          // alignSelf: 'stretch',
        }}
        contentContainerStyle={{ width: '100%', justifyContent: 'center' }}
        data={questionOptions}
        renderItem={renderItem}
        ItemSeparatorComponent={renderItemSeparation}
        keyExtractor={KeyExtractorHelper}
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

      <SizedBox.Large height />
      <Expanded
        flexDirection="row"
        backgroundColor={theme.colors.surface}
        style={{
          marginHorizontal: theme.layouts.large,
          paddingHorizontal: theme.layouts.large,
          borderRadius: theme.layouts.defaultRadius,
        }}>
        <ExpandedWithLayout
          flex={2}
          flexDirection="row"
          justifyContent="center">
          {!_.isEmpty(exerciseImage) && (
            <ChildImage
              source={exerciseImage}
              fallbacksize={0.8}
              relativesize={1}
            />
          )}
          {_.isEmpty(exerciseImage) && (
            <Row
              style={{
                alignSelf: 'stretch',
                justifyContent: 'center',
              }}>
              {renderOptionList()}
            </Row>
          )}
        </ExpandedWithLayout>
        <SizedBox.Large width />
        <Expanded justifyContent="center">
          <H5>ចម្លើយ</H5>
          <SizedBox.Large height />

          <DOption1Item
            option={attempt.selection}
            isSelected={false}
            // onPress={() => handleOptionPress(item)}
          />
        </Expanded>
      </Expanded>
      <SizedBox.Large height />
      {!_.isEmpty(exerciseImage) && (
        <Row
          style={{
            alignSelf: 'stretch',
            justifyContent: 'center',
          }}>
          {renderOptionList()}
        </Row>
      )}
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
