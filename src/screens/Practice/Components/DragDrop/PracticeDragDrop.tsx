import {
  DropItemHandler,
  MatchingItemHandler,
  PracticeHandler,
  QuestionHeading,
  QuestionOption,
} from '@/models';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PracticeProps } from '../../PracticeScreen';
import { useTheme } from 'styled-components/native';
import { useScreenDimension } from '@/services';
import {
  Container,
  DragItem,
  DropItem,
  Expanded,
  PracticeFooter,
  PracticeHeading,
  SizedBox,
} from '@/components';
import { FlatList } from 'react-native';
import { KeyExtractorHelper } from '@/utils';
import { useForm } from 'react-hook-form';
import _ from 'lodash';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeDragDrop(
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
    const questionOptions = useMemo(
      () => _.get(question, 'questionobject.questionoptions', []),
      [question],
    );
    const dragItems = useMemo(() => _.shuffle(questionOptions), [question]);

    const dropItemRefs = useRef<Record<string, DropItemHandler>>({});
    const matchingItemRefs = useRef<Record<string, MatchingItemHandler>>({});

    const methods = useForm<{
      tries: number;
      answers: Record<string, string>;
      pairing: Record<string, string>;
      currentOption: QuestionOption | undefined;
    }>({
      defaultValues: {
        tries: 1,
        answers: {},
        pairing: {},
        currentOption: undefined,
      },
    });

    const [isShowingAnswer, setIsShowingAnswer] = useState<boolean>(false);

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetry(true);
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
      setIsShowingAnswer(false);
    }, [currentQuestionIndex]);

    const handleSubmit = () => {
      if (isShowingAnswer) {
        onSubmit(methods.getValues('tries'), false, isShowingAnswer);
        return;
      }

      const answers = methods.getValues('answers');
      console.log('ALL : ', answers);
      const isCorrect = _.reduce(
        questionOptions,
        (result, value) => {
          console.log('Key: ', value.questionoptionid);
          console.log('Value: ', answers[value.questionoptionid]);
          if (
            _.isEmpty(answers[value.questionoptionid]) ||
            answers[value.questionoptionid] !== value.questionoptionid
          )
            result = false;

          return result;
        },
        true,
      );

      onSubmit(methods.getValues('tries'), isCorrect);
      handleRetry();
    };

    const handleSetAnswerValue = async (dropAreaId = '', newOccupant = '') => {
      // Get current occupant
      const currentAreaOccupant = methods.getValues('answers')[dropAreaId];
      const newOccupantOldArea = methods.getValues('pairing')[newOccupant];

      methods.setValue('answers', {
        ...methods.getValues('answers'),
        [dropAreaId]: newOccupant,
      });

      return currentAreaOccupant ?? '';
    };

    const handleRetry = (chargeAttempt = false) => {
      console.log('RESETTING');
      _.forEach(questionOptions, qOpt => {
        if (dropItemRefs.current[qOpt.questionoptionid])
          dropItemRefs.current[qOpt.questionoptionid].deselect();
        if (matchingItemRefs.current[qOpt.questionoptionid])
          matchingItemRefs.current[qOpt.questionoptionid].deselect();
      });
      const newTries = chargeAttempt
        ? methods.getValues('tries') + 1
        : methods.getValues('tries');
      methods.setValue('answers', {});
      methods.setValue('tries', newTries);
    };

    const handleQuestionPress = (qOption: QuestionOption) => {
      if (isShowingAnswer) return;
      if (!dropItemRefs.current) return;
      const currentOption = methods.getValues('currentOption');
      const previousItem =
        dropItemRefs.current[qOption.questionoptionid].retrieveValue();
      console.log('Previous Item: ', previousItem);
      if (_.isEmpty(currentOption)) {
        if (!_.isEmpty(previousItem))
          matchingItemRefs.current[previousItem.questionoptionid].show();
        dropItemRefs.current[qOption.questionoptionid].deselect();

        handleSetAnswerValue(qOption.questionoptionid, '');
      } else {
        if (!_.isEmpty(previousItem))
          matchingItemRefs.current[previousItem.questionoptionid].show();
        matchingItemRefs.current[currentOption.questionoptionid].hide();
        dropItemRefs.current[qOption.questionoptionid].select(currentOption);
        methods.setValue('currentOption', undefined);
        handleSetAnswerValue(
          qOption.questionoptionid,
          currentOption.questionoptionid,
        );
      }
      methods.setValue('currentOption', undefined);
    };

    const handleOptionPress = (qOption: QuestionOption) => {
      if (!matchingItemRefs.current) return;
      const currentOption = methods.getValues('currentOption');
      if (qOption.questionoptionid !== currentOption?.questionoptionid) {
        if (!_.isEmpty(currentOption))
          matchingItemRefs.current[currentOption.questionoptionid].deselect();
        methods.setValue('currentOption', qOption);
        matchingItemRefs.current[qOption.questionoptionid].select();
      } else {
        methods.setValue('currentOption', undefined);
        matchingItemRefs.current[qOption.questionoptionid].deselect();
      }
    };

    const renderItemSeparator = () => <SizedBox.Large height />;

    const renderQuestionItem = ({ item }: { item: QuestionOption }) => {
      return (
        <DropItem
          ref={r => {
            if (!r) return;
            dropItemRefs.current[item.questionoptionid] = r;
          }}
          option={item}
          disabled={false}
          isShowingAnswer={isShowingAnswer}
          onPress={() => handleQuestionPress(item)}
        />
      );
    };

    const renderQuestions = () => {
      return (
        <FlatList
          style={{ flex: 2, alignSelf: 'stretch' }}
          data={questionOptions}
          renderItem={renderQuestionItem}
          ItemSeparatorComponent={renderItemSeparator}
          keyExtractor={KeyExtractorHelper}
        />
      );
    };

    const renderOptionItem = ({ item }: { item: QuestionOption }) => {
      return (
        <DragItem
          ref={r => {
            if (!r) return;
            matchingItemRefs.current[item.questionoptionid] = r;
          }}
          option={item}
          disabled={isShowingAnswer}
          isShowingAnswer={isShowingAnswer}
          onPress={() => handleOptionPress(item)}
        />
      );
    };

    const renderOptions = () => {
      return (
        <FlatList
          style={{
            flex: 1,
            borderRadius: theme.layouts.defaultRadius,
            backgroundColor: theme.colors.surface,
            alignSelf: 'stretch',
          }}
          contentContainerStyle={{
            padding: theme.layouts.large,
            alignItems: 'center',
          }}
          data={dragItems}
          renderItem={renderOptionItem}
          ItemSeparatorComponent={renderItemSeparator}
          keyExtractor={KeyExtractorHelper}
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
          {renderQuestions()}
          <SizedBox.Large width />
          {renderOptions()}
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
