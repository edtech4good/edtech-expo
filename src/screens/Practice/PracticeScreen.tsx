import {
  BackButton,
  BlackVeil,
  DefaultBackgroundImage,
  Expanded,
  LayoutScrollView,
  PracticeContent,
} from '@/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { useTheme } from 'styled-components/native';
import { useAppSelector } from '@/redux';
import { getSelectedLesson, getSelectedModule } from '@/redux/slices';
import { usePractice } from '@/services';
import _ from 'lodash';
import {
  LessonPractice,
  PracticeHandler,
  PracticeResult,
  Question,
} from '@/models';
import { useForm } from 'react-hook-form';
import { createTimeStamp } from '@/utils';
import { Modal } from 'react-native';
import ResultPopUp from './Components/ResultPopUp';
import { toPracticeQuestionResult } from '@/transforms';

export interface PracticeProps {
  question: Question;
  currentQuestionIndex: number;
  maxQuestion: number;
  onRetry?: () => void;
  onSubmit?: (
    tries: number,
    isCorrect: boolean,
    isShowingAnswer?: boolean,
  ) => void;
}

export default function PracticeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const selectedModule = useAppSelector(getSelectedModule);
  const selectedLesson = useAppSelector(getSelectedLesson);
  const { fetch, questions, saveResult } = usePractice(
    (selectedModule as LessonPractice)?.lessonpracticeid ?? '',
  );
  const [question, setQuestion] = useState(0);
  const currentQuestion = useMemo(
    () => questions[question],
    [questions, question],
  );

  const [{ isCorrect, isVisible, tries, customMessages }, setModal] = useState<{
    isVisible: boolean;
    isCorrect: boolean;
    tries: number;
    customMessages?: { correctMessage: string; incorrectMessage: string };
  }>({
    isVisible: false,
    isCorrect: false,
    tries: 0,
    customMessages: undefined,
  });

  const practiceRef = useRef<PracticeHandler>(null);

  const methods = useForm<PracticeResult>({
    defaultValues: {
      starttime: createTimeStamp(),
      endtime: undefined,
      result: [],
    },
  });

  useEffect(() => {
    navigation.setOptions({
      title: (selectedModule as LessonPractice)?.lessonpracticename,
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

  const handleSubmitPress = async (
    tries: number,
    isCorrect: boolean,
    isShowingAnswer: boolean,
  ) => {
    if (isShowingAnswer) {
      if (question === questions.length - 1) {
        const practiceResult = {
          starttime: methods.getValues('starttime'),
          result: methods.getValues('result'),
          endtime: createTimeStamp(),
        } as PracticeResult;
        await saveResult(practiceResult);
        router.back();
      } else setQuestion(val => val + 1);
      return;
    }

    if (isCorrect) {
      const result = toPracticeQuestionResult(
        isCorrect,
        tries,
        currentQuestion,
      );
      const currentResults = methods.getValues('result');
      methods.setValue('result', [...currentResults, result]);
      if (question === questions.length - 1) {
        console.log('COMPLETED : ', methods.getValues('result'));
        const practiceResult = {
          starttime: methods.getValues('starttime'),
          result: methods.getValues('result'),
          endtime: createTimeStamp(),
        } as PracticeResult;
        await saveResult(practiceResult);
        router.back();
      }
    }
    setModal(val => ({
      isCorrect,
      isVisible: true,
      tries,
    }));
    console.log('Cur Result: ', methods.getValues('result'));
  };

  const handleRetryPress = () => {
    console.log('RETRY', practiceRef.current);
    if (!practiceRef.current) return;
    practiceRef.current.retry();
  };

  const handleModalPress = () => {
    if (isCorrect) {
      setModal(val => ({ ...val, isVisible: false }));
      if (_.isEmpty(questions[question + 1])) return;
      setQuestion(val => val + 1);
    } else {
      setModal(val => ({ ...val, isVisible: false }));
      if (!practiceRef.current) return;
      if (tries > 2) practiceRef.current.revealAnswer();
      else practiceRef.current.retry();
    }
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
      <Modal
        animationType="fade"
        transparent={true}
        presentationStyle="overFullScreen"
        visible={isVisible}>
        <BlackVeil opacity={0.8} />
        <Expanded justifyContent="center" alignItems="center">
          <ResultPopUp
            isCorrect={isCorrect ?? true}
            showAnswer={tries > 2}
            customMessages={customMessages}
            onPress={handleModalPress}
          />
        </Expanded>
      </Modal>
    </LayoutScrollView>
  );
}
