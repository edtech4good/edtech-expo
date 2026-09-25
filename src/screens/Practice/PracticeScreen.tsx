import {
  BackButton,
  BlackVeil,
  DefaultBackgroundImage,
  Expanded,
  LayoutScrollView,
  PracticeContent,
} from '@/components';
import EyebrowText from '@/components/ui/EyebrowText';
import ProgressBar from '@/components/ui/ProgressBar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { useTheme } from 'styled-components/native';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  ActivityProgressActions,
  getProfile,
  getSelectedLanguage,
  getSelectedLesson,
  getSelectedModule,
} from '@/redux/slices';
import {
  useDesign,
  useFont,
  useNavShell,
  usePractice,
  notifyResultQueued,
} from '@/services';
import { NAV_RAIL_WIDTH } from '@/components/ui/NavRail';
import { NAV_SIDEBAR_WIDTH } from '@/components/ui/NavSidebar';
import { PASS_PERCENTAGE } from '@/constants';
import {
  ActivityIndicator,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
import { useTranslation } from 'react-i18next';

// Corporate header side slots (handoff §4, v2.1): the title must never
// reach the back button on the left or the "N OF total" counter on the
// right. Reserve the larger of the two on both sides so the centred title
// stays centred instead of drifting toward whichever slot is smaller.
// LEFT_SLOT ~ BackButton's 36px icon + 16px left margin + a few px of
// native-stack left padding, rounded up. RIGHT_SLOT ~ the longest counter
// label, "1 ក្នុងចំណោម 10" at the Khmer eyebrow's fixed 13px (~110dp),
// plus its own right margin (pageHorizontalPadding).
const LEFT_SLOT = 64;
const RIGHT_SLOT = 130;
const HEADER_SIDE_SLOT = Math.max(LEFT_SLOT, RIGHT_SLOT);

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
  // Quiz has no Retry equivalent (answers are scored, not retried), so the
  // corporate footer hides the Retry pill and shows only Submit there.
  // Practice (unscored) keeps Retry — this defaults to false/undefined.
  hideRetry?: boolean;
}

export default function PracticeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const displayBold = useFont('bold', 'display');
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const { isRail, isSidebar } = useNavShell();

  const dispatch = useAppDispatch();
  const selectedModule = useAppSelector(getSelectedModule);
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const isKhmer = selectedLanguage === 'km';
  const selectedLesson = useAppSelector(getSelectedLesson);
  const userId = useAppSelector(getProfile)?.schooluserid ?? null;
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
    customMessages?: { correctMessage?: string; incorrectMessage?: string };
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
    const practiceName = (selectedModule as LessonPractice)?.lessonpracticename;
    navigation.setOptions({
      title: practiceName,
      headerLeft: () => <BackButton onPress={handleBackPress} />,
      // Android native-stack (react-native-screens) renders its own stock
      // back chevron alongside a custom headerLeft unless headerBackVisible
      // is explicitly turned off — that was the second, thinner arrow at
      // the far left (the heavier Material one was our BackButton). This
      // applies whether or not isCorporate, so it's set unconditionally.
      headerBackVisible: false,
      headerTitleAlign: 'center',
      // Corporate child app bar (handoff §4, v2.1): centred title wraps to
      // up to two lines instead of truncating (kids keeps the stock
      // single-line header, untouched, via the stack's default options),
      // and a mono "N OF total" eyebrow sits on the right — the
      // current/total question count. The title is wrapped in a max-width
      // View so it can never grow into the back button or the counter —
      // see HEADER_SIDE_SLOT above.
      ...(isCorporate
        ? {
            headerTitle: () => (
              // On the tablet nav rail (or desktop sidebar), the header is
              // narrower than the window by that nav's fixed width, so subtract it too or the
              // title's max-width overshoots the header's actual space.
              <View
                style={{
                  maxWidth:
                    windowWidth -
                    (isSidebar
                      ? NAV_SIDEBAR_WIDTH
                      : isRail
                      ? NAV_RAIL_WIDTH
                      : 0) -
                    2 * HEADER_SIDE_SLOT,
                }}>
                <Text
                  numberOfLines={isKhmer ? 1 : 2}
                  ellipsizeMode="tail"
                  style={{
                    fontFamily: displayBold,
                    fontSize: theme.fontSizes.subtitle,
                    // Khmer combining marks need more vertical room than
                    // Latin script (v2.1: 1.6-1.7x); we cap Khmer to a
                    // single line (with an end ellipsis) rather than
                    // stretching it to two, because the native Android
                    // header height is fixed and two Khmer lines at that
                    // line-height risk being clipped top/bottom — English
                    // keeps its normal line-height and two-line wrap.
                    lineHeight: isKhmer
                      ? theme.fontSizes.subtitle * 1.65
                      : undefined,
                    color: theme.colors.onBackground,
                    textAlign: 'center',
                  }}>
                  {practiceName}
                </Text>
              </View>
            ),
            headerRight: () => (
              <EyebrowText
                testID="practice-progress-label"
                size={theme.fontSizes.eyebrow}
                color={theme.colors.primary}
                style={{ marginRight: theme.layouts.pageHorizontalPadding }}>
                {t('screen.practice.progressLabel', {
                  i: question + 1,
                  n: questions.length,
                })}
              </EyebrowText>
            ),
          }
        : {}),
    });
  }, [
    selectedModule,
    isCorporate,
    question,
    questions.length,
    windowWidth,
    isRail,
    isSidebar,
    isKhmer,
  ]);

  useEffect(() => {
    if (!selectedModule) return;
    fetch();
  }, [selectedModule]);

  useEffect(() => {
    console.log('===== Current Question =====', currentQuestion);
  }, [currentQuestion]);

  // Optimistic local status write, done whether the submit below lands
  // online or gets queued for later. The result array only contains
  // correctly-answered questions (unlike the quiz's), so the correct count
  // is just its length; `total` is the question count actually shown in
  // this practice (an empty practice counts as done, matching the server:
  // there's nothing to fail).
  const markPracticeStatus = (result: PracticeResult['result']) => {
    const lessonpracticeid = (selectedModule as LessonPractice)
      ?.lessonpracticeid;
    if (!userId || !lessonpracticeid) return;
    const total = questions.length;
    const correct = result.length;
    const percentage = total === 0 ? 100 : (correct * 100) / total;
    const isDone = percentage >= PASS_PERCENTAGE;
    dispatch(
      ActivityProgressActions.markLocal({
        userId,
        activityId: lessonpracticeid,
        status: isDone ? 'done' : 'inProgress',
        // "Unsynced" (pending-results badge/styling) is derived purely from
        // status === 'done' plus the offline queue still holding a result
        // for this activity — see useActivityProgress.unsyncedFor.
      }),
    );
  };

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
        markPracticeStatus(practiceResult.result);
        const { synced } = await saveResult(practiceResult);
        router.back();
        if (!synced)
          notifyResultQueued(
            t('screen.practice.resultQueuedTitle'),
            t('screen.practice.resultQueuedMessage'),
          );
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
    }
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
      tries,
      customMessages,
    }));
    console.log('Cur Result: ', methods.getValues('result'));
  };

  const handleRetryPress = () => {
    console.log('RETRY', practiceRef.current);
    if (!practiceRef.current) return;
    practiceRef.current.retry();
  };

  const handleModalPress = async () => {
    if (isCorrect) {
      setModal(val => ({ ...val, isVisible: false }));
      if (_.isEmpty(questions[question + 1])) {
        const practiceResult = {
          starttime: methods.getValues('starttime'),
          result: methods.getValues('result'),
          endtime: createTimeStamp(),
        } as PracticeResult;
        markPracticeStatus(practiceResult.result);
        const { synced } = await saveResult(practiceResult);
        router.back();
        if (!synced)
          notifyResultQueued(
            t('screen.practice.resultQueuedTitle'),
            t('screen.practice.resultQueuedMessage'),
          );
        return;
      }
      setQuestion(val => val + 1);
    } else {
      setModal(val => ({ ...val, isVisible: false }));
      if (!practiceRef.current) return;
      if (tries > 2) practiceRef.current.revealAnswer();
      else practiceRef.current.retry();
    }
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
      {isCorporate && (
        <ProgressBar
          testID="practice-progress-track"
          variant="quiz"
          progress={
            questions.length > 0 ? (question + 1) / questions.length : 0
          }
        />
      )}
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
