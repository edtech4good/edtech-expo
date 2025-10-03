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
import { getSelectedModule } from '@/redux/slices';
import { useQuiz, useResult } from '@/services';
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

// const CustomMessages: Record<string, CustomMessage> = {
//   'Have you ever had a post on social media and get misunderstood?': {
//     correctMessage: "You're not alone. Misunderstandings are common.",
//     incorrectMessage: "That's great! But it's still important to be aware.",
//   },
//   "What could go wrong with Dara's post?": {
//     correctMessage:
//       "Correct! It's important to consider how others might interpret your post.",
//     incorrectMessage:
//       'Jokes can sometimes be taken the wrong way, especially without context.',
//   },
//   'Soon, Dara notices comments that show some friends are confused. What should Dara do next?':
//     {
//       correctMessage: 'Yes, explaining can help clarify the situation.',
//       incorrectMessage: 'Ignoring can escalate the misunderstanding.',
//     },
//   'Do you feel more confident about sharing on social media now?': {
//     correctMessage: 'Great! Keep these tips in mind.',
//     incorrectMessage: "That's okay, practice makes perfect",
//   },
// };

export default function QuizScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const { calculateResult } = useResult();
  const selectedModule = useAppSelector(getSelectedModule);
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
    customMessages?: { correctMessage: string; incorrectMessage: string };
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
    if (navigation.canGoBack())
      navigation.setOptions({
        headerLeft: () => <BackButton onPress={handleBackPress} />,
      });
  }, []);

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
    router.back();
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
      await saveResult(quizResult);
      await calculateResult(methods.getValues('result'));
      router.replace('/home/result');
    }
  };

  const handleSubmitPress = async (tries: number, isCorrect: boolean) => {
    const result = toQuizQuestionResult(isCorrect, currentQuestion);
    const currentResults = methods.getValues('result');
    methods.setValue('result', [...currentResults, result]);
    setModal(val => ({
      isCorrect,
      isVisible: true,
    }));
    console.log('Cur Result: ', methods.getValues('result'));
  };

  const handleRetryPress = () => {
    if (!practiceRef.current) return;
  };

  if (_.isEmpty(currentQuestion)) return <DefaultBackgroundImage />;

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
