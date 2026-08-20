import {
  BackButton,
  BlackVeil,
  DefaultBackgroundImage,
  Expanded,
  GenericModal,
  LayoutScrollView,
  PracticeContent,
} from '@/components';
import {
  LessonQuiz,
  ModalHandler,
  PracticeHandler,
  QuizResult,
} from '@/models';
import { useAppSelector } from '@/redux';
import { getSelectedLesson, getSelectedModule } from '@/redux/slices';
import { useDesign, useQuiz, useResult, notifyResultQueued } from '@/services';
import { ActivityIndicator, View } from 'react-native';
import { createTimeStamp } from '@/utils';
import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from 'react-native';
import { useTheme } from 'styled-components/native';
import ResultPopUp from '../Practice/Components/ResultPopUp';
import _ from 'lodash';
import PracticeMCQText from '../Practice/Components/MCQText/PracticeMCQText';
import PracticeMCQImage from '../Practice/Components/MCQImage/PracticeMCQImage';
import { toQuizQuestionResult } from '@/transforms';
import PracticeArrangeText from '../Practice/Components/ArrangeText/PracticeArrangeText';
import PracticeFillBlank from '../Practice/Components/FillBlank/PracticeFillBlank';
import PracticeArrangeImage from '../Practice/Components/ArrangeImage/PracticeArrangeImage';
import PracticeDragDrop from '../Practice/Components/DragDrop/PracticeDragDrop';
import { useTranslation } from 'react-i18next';

export default function QuizScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const navigation = useNavigation();

  const { calculateResult } = useResult();
  const selectedModule = useAppSelector(getSelectedModule);
  const selectedLesson = useAppSelector(getSelectedLesson);
  const { fetch, saveResult, questions } = useQuiz(
    (selectedModule as LessonQuiz)?.lessonquizid ?? '',
  );
  const [question, setQuestion] = useState(0);
  const currentQuestion = useMemo(
    () => questions[question],
    [questions, question],
  );

  const [{ isCorrect, isVisible, customMessages }, setModal] = useState<{
    isVisible: boolean;
    isCorrect: boolean;
    customMessages?: { correctMessage?: string; incorrectMessage?: string };
  }>({
    isVisible: false,
    isCorrect: false,
    customMessages: undefined,
  });

  const practiceRef = useRef<PracticeHandler>(null);
  const promptModalRef = useRef<ModalHandler>(null);

  const methods = useForm<QuizResult>({
    defaultValues: {
      starttime: createTimeStamp(),
      endtime: undefined,
      result: [],
    },
  });

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton onPress={handleBackPress} />,
    });
  }, [navigation]);

  useEffect(() => {
    if (!selectedModule) return;
    fetch();
  }, [selectedModule]);

  useEffect(() => {
    console.log('===== Current Question =====', currentQuestion);
  }, [currentQuestion]);

  const handleBackPress = () => {
    if (!promptModalRef.current) return;
    promptModalRef.current.show(t('screen.practice.exitQuizMessage'));
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      const params = selectedLesson
        ? { lessonid: selectedLesson.lessonid }
        : undefined;
      router.replace({
        pathname: '/home/lessons',
        params,
      });
    }
  };

  const handleModalPress = async () => {
    setModal(val => ({ ...val, isVisible: false }));
    if (question < questions.length - 1) setQuestion(val => val + 1);
    else {
      const quizResult = {
        starttime: methods.getValues('starttime'),
        result: methods.getValues('result'),
        endtime: createTimeStamp(),
      } as QuizResult;
      const { synced } = await saveResult(quizResult);
      await calculateResult(methods.getValues('result'));
      router.replace('/home/result');
      if (!synced)
        notifyResultQueued(
          t('screen.practice.resultQueuedTitle'),
          t('screen.practice.resultQueuedMessage'),
        );
    }
  };

  const handleSubmitPress = async (tries: number, isCorrect: boolean) => {
    const result = toQuizQuestionResult(isCorrect, currentQuestion);
    const currentResults = methods.getValues('result');
    methods.setValue('result', [...currentResults, result]);
    const fb = currentQuestion?.question?.questionobject?.questionfeedback;
    const customMessages =
      fb && (fb.correctmessage || fb.incorrectmessage)
        ? {
            correctMessage: fb.correctmessage || undefined,
            incorrectMessage: fb.incorrectmessage || undefined,
          }
        : undefined;
    setModal(val => ({
      isCorrect,
      isVisible: true,
      customMessages,
    }));
    console.log('Cur Result: ', methods.getValues('result'));
  };

  const handleRetryPress = () => {
    if (!practiceRef.current) return;
  };

  if (_.isEmpty(currentQuestion)) {
    if (isCorporate) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }
    return <DefaultBackgroundImage />;
  }

  return (
    <LayoutScrollView backgroundColor={theme.colors.background}>
      <PracticeContent
        ref={practiceRef}
        key={currentQuestion.question.questionnid}
        question={currentQuestion.question}
        currentQuestionIndex={question + 1}
        maxQuestion={questions.length}
        onSubmit={handleSubmitPress}
        onRetry={handleRetryPress}
      />
      {/* {currentQuestion.question.templatetypeid === 7 && (
        <PracticeDragDrop
          ref={practiceRef}
          key={currentQuestion.question.questionnid}
          question={currentQuestion.question}
          currentQuestionIndex={question + 1}
          maxQuestion={questions.length}
          onSubmit={handleSubmitPress}
          onRetry={handleRetryPress}
        />
      )}
      {(currentQuestion.question.templatetypeid === 1 ||
        currentQuestion.question.templatetypeid === 3) && (
        <PracticeMCQText
          ref={practiceRef}
          key={currentQuestion.question.questionnid}
          question={currentQuestion.question}
          currentQuestionIndex={question + 1}
          maxQuestion={questions.length}
          onSubmit={handleSubmitPress}
          onRetry={handleRetryPress}
        />
      )}
      {(currentQuestion.question.templatetypeid === 4 ||
        currentQuestion.question.templatetypeid === 2) && (
        <PracticeMCQImage
          ref={practiceRef}
          key={currentQuestion.question.questionnid}
          question={currentQuestion.question}
          currentQuestionIndex={question + 1}
          maxQuestion={questions.length}
          onSubmit={handleSubmitPress}
          onRetry={handleRetryPress}
        />
      )}

      {currentQuestion.question.templatetypeid === 5 && (
        <PracticeArrangeText
          ref={practiceRef}
          key={currentQuestion.question.questionnid}
          question={currentQuestion.question}
          currentQuestionIndex={question + 1}
          maxQuestion={questions.length}
          onSubmit={handleSubmitPress}
          onRetry={handleRetryPress}
        />
      )}

      {currentQuestion.question.templatetypeid === 8 && (
        <PracticeFillBlank
          ref={practiceRef}
          key={currentQuestion.question.questionnid}
          question={currentQuestion.question}
          currentQuestionIndex={question + 1}
          maxQuestion={questions.length}
          onSubmit={handleSubmitPress}
          onRetry={handleRetryPress}
        />
      )}

      {currentQuestion.question.templatetypeid === 6 && (
        <PracticeArrangeImage
          ref={practiceRef}
          key={currentQuestion.question.questionnid}
          question={currentQuestion.question}
          currentQuestionIndex={question + 1}
          maxQuestion={questions.length}
          onSubmit={handleSubmitPress}
          onRetry={handleRetryPress}
        />
      )} */}

      <Modal
        animationType="fade"
        transparent={true}
        presentationStyle="overFullScreen"
        visible={isVisible}>
        <BlackVeil opacity={0.8} />
        <Expanded justifyContent="center" alignItems="center">
          <ResultPopUp
            isCorrect={isCorrect}
            customMessages={customMessages}
            onPress={handleModalPress}
          />
        </Expanded>
      </Modal>
      <GenericModal
        ref={promptModalRef}
        type="prompt"
        onCancel={() => {
          promptModalRef.current?.hide();
        }}
        onConfirm={handleGoBack}
      />
    </LayoutScrollView>
  );
}
