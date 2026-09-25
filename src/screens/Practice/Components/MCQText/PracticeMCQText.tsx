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
import {
  useBreakpoint,
  useDesign,
  useResource,
  useScreenDimension,
} from '@/services';
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
      hideRetry = false,
      multipleChoice = false,
    }: MCQTextProps,
    ref,
  ) {
    const theme = useTheme();
    const { isCorporate } = useDesign();
    const { unblockHeightWithoutHeader } = useScreenDimension();

    // ROADMAP Track B (phone learner path): below 768dp the landscape
    // two-pane row (media | options, each crushed to ~180dp) is replaced
    // with a vertical stack — heading, then media, then options filling
    // the remaining scrollable space. Tablet/desktop keep today's row.
    const isStacked =
      useBreakpoint({
        mobile: true,
        phablet: false,
        tablet: false,
        desktop: false,
      }) === true;

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

    const renderItem = ({
      item,
      index,
    }: {
      item: QuestionOption;
      index: number;
    }) => {
      return (
        <MCQTextItem
          key={item.questionoptionid}
          text={item.questionoptiontext}
          isSelected={!_.isEmpty(attempt.selections[item.questionoptionid])}
          audioUrl={_.get(item, 'questionoptionfile.filename', '')}
          disabled={isShowingAnswer}
          isShowingAnswer={isShowingAnswer}
          isCorrect={item.questionoptioniscorrect}
          index={index}
          onPress={() => handleItemPress(item)}
        />
      );
    };

    // UX audit U-15: question card, options and footer now share the
    // corporate 20 dp gutter on phone (kids keep the shared 12 dp medium).
    const stackedGutter = isCorporate
      ? theme.layouts.pageHorizontalPadding
      : theme.layouts.medium;

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
          flexDirection={isStacked ? 'column' : 'row'}
          paddingLeft={isStacked ? stackedGutter : theme.layouts.large}
          paddingRight={isStacked ? stackedGutter : theme.layouts.large}>
          {!_.isEmpty(source) && (
            <ExpandedWithLayout
              flex={isStacked ? 1 : undefined}
              backgroundColor={theme.colors.surface}
              justifyContent="center"
              style={
                isCorporate
                  ? { borderWidth: 1, borderColor: theme.colors.divider }
                  : undefined
              }>
              <PracticeFile
                id={question.questionnid}
                file={_.get(question, 'questionobject.questionfile')}
                onPress={handleQuestionFilePress}
              />
            </ExpandedWithLayout>
          )}
          {!_.isEmpty(source) &&
            (isStacked ? <SizedBox.Large height /> : <SizedBox.Large width />)}
          <Expanded flex={isStacked ? 2 : 1.5}>
            <FlatList
              style={{ flex: 1, width: '100%' }}
              data={options}
              renderItem={renderItem}
              keyExtractor={KeyExtractorHelper}
              contentContainerStyle={
                isStacked ? { paddingBottom: theme.layouts.medium } : undefined
              }
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
          hideRetry={hideRetry}
        />
      </Container>
    );
  },
);
