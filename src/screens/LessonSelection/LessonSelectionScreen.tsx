import {
  AppButton,
  Column,
  DefaultBackgroundImage,
  H4,
  LayoutScrollView,
  LessonStepRow,
  Row,
} from '@/components';
import {
  Redirect,
  router,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import LessonItem from './components/LessonItem';
import {
  useActivityProgress,
  useDesign,
  useFont,
  useLesson,
  useTypeRole,
} from '@/services';
import { useAppSelector } from '@/redux';
import {
  getSelectedCourse,
  getSelectedLanguage,
  getSelectedLesson,
  getSelectedUnit,
} from '@/redux/slices';
import { LessonLearning, LessonPractice, LessonQuiz } from '@/models';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { getRemoteResourceUrl } from '@/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActivityType = 'learning' | 'practice' | 'quiz';

const routers = {
  learning: 'home/lessons/1',
  practice: 'home/practices/1',
  quiz: 'home/quizzes/1',
};

export default function LessonSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ lessonid?: string }>();
  const selectedLesson = useAppSelector(getSelectedLesson);
  const selectedCourse = useAppSelector(getSelectedCourse);
  const selectedUnit = useAppSelector(getSelectedUnit);
  // The URL param survives a browser reload on web; the redux selection covers
  // native, where navigate() is not always given params by older code paths.
  const lessonId =
    (typeof params.lessonid === 'string' && params.lessonid) ||
    selectedLesson?.lessonid ||
    '';
  const { fetch, clear, selectModule, lesson } = useLesson(lessonId);
  const { statusFor, questionCountFor, unsyncedFor } =
    useActivityProgress(lessonId);
  const chipFontFamily = useFont('normal', 'body');
  const bodyFontFamily = useFont('normal', 'body');
  // design v2.1 Khmer type scale roles.
  const screenTitleType = useTypeRole('screenTitle');
  const cardTitleType = useTypeRole('cardTitle');
  const bodyType = useTypeRole('body');
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  // Lesson chip: Khmer floor — never below 13px.
  const chipFontSize = isKhmer ? 13 : 12;
  const chipLineHeight = isKhmer ? 20 : undefined;

  /**
   * `type` is what decides which renderer runs. It has to be a stable key rather
   * than `title`, which is translated: in Khmer `t('screen.lesson.learningTitle')`
   * is 'សិក្សា', so comparing it against the literal 'Learning' was never true and
   * every activity list rendered empty. The lesson still arrived from the API with
   * its learnings, practices and quizzes; the screen just dropped them.
   */
  const sectionData = useMemo(() => {
    if (_.isEmpty(lesson)) return [];
    return [
      {
        type: 'learning' as const,
        title: t('screen.lesson.learningTitle'),
        data: lesson.lessonlearnings,
      },
      {
        type: 'practice' as const,
        title: t('screen.lesson.practiceTitle'),
        data: lesson.lessonpractices,
      },
      {
        type: 'quiz' as const,
        title: t('screen.lesson.quizTitle'),
        data: lesson.lessonquizzes,
      },
    ];
  }, [lesson, t]);

  useEffect(() => {
    navigation.setOptions({ title: t('screen.lesson.header') });
  }, []);

  useEffect(() => {
    if (!lessonId) return;
    fetch();

    return () => {
      clear();
    };
  }, [lessonId]);

  const handleItemPress = async (
    mod: LessonLearning | LessonPractice | LessonQuiz,
    type: ActivityType,
  ) => {
    // await dispatch(SelectionActions.selectModule(mod));
    await selectModule(mod);
    router.navigate(routers[type]);
  };

  const renderSection = ({
    section,
  }: {
    section: {
      type: ActivityType;
      title: string;
      data: LessonLearning[] | LessonPractice[] | LessonQuiz[];
    };
  }) => {
    return (
      <Column paddingLeft={theme.layouts.large}>
        <H4 alignSelf="flex-start" fontWeight="semi">
          {section.title}
        </H4>
        <Row style={{ flexWrap: 'wrap' }}>
          {section.type === 'learning' &&
            _.map(section.data, d => {
              return renderLessonLearning(d as LessonLearning);
            })}
          {section.type === 'practice' &&
            _.map(section.data, d => {
              return renderLessonPractice(d as LessonPractice);
            })}
          {section.type === 'quiz' &&
            _.map(section.data, d => {
              return renderLessonQuiz(d as LessonQuiz);
            })}
        </Row>
      </Column>
    );
  };

  const renderLessonLearning = (ll: LessonLearning) => {
    return (
      <LessonItem
        key={ll.lessonlearningid}
        description={'3mn'}
        title={ll.lessonlearningname}
        onPress={() => handleItemPress(ll, 'learning')}
      />
    );
  };

  const renderLessonPractice = (lp: LessonPractice) => {
    return (
      <LessonItem
        key={lp.lessonpracticeid}
        description="3mn"
        title={lp.lessonpracticename}
        onPress={() => handleItemPress(lp, 'practice')}
      />
    );
  };

  const renderLessonQuiz = (lq: LessonQuiz) => {
    return (
      <LessonItem
        key={lq.lessonquizid}
        description="3mn"
        title={lq.lessonquizname}
        onPress={() => handleItemPress(lq, 'quiz')}
      />
    );
  };

  const renderLessonSection = () => {
    return (
      <Column paddingLeft={theme.layouts.large}>
        <H4 alignSelf="flex-start" fontWeight="semi">
          {t('screen.lesson.learningTitle')}
        </H4>
        <Row
          style={{
            width: '100%',
            flexWrap: 'wrap',
          }}>
          {_.map(
            _.sortBy(lesson?.lessonlearnings, 'lessonlearningorder'),
            d => {
              return renderLessonLearning(d as LessonLearning);
            },
          )}
        </Row>
      </Column>
    );
  };

  const renderPracticeSection = () => {
    return (
      <Column paddingLeft={theme.layouts.large}>
        <H4 alignSelf="flex-start" fontWeight="semi">
          {t('screen.lesson.practiceTitle')}
        </H4>
        <Row
          style={{
            width: '100%',
            flexWrap: 'wrap',
          }}>
          {_.map(
            _.sortBy(lesson?.lessonpractices, 'lessonpracticeorder'),
            d => {
              return renderLessonPractice(d as LessonPractice);
            },
          )}
        </Row>
      </Column>
    );
  };

  const renderQuizSection = () => {
    return (
      <Column paddingLeft={theme.layouts.large}>
        <H4 alignSelf="flex-start" fontWeight="semi">
          {t('screen.lesson.quizTitle')}
        </H4>
        <Row
          style={{
            width: '100%',
            flexWrap: 'wrap',
          }}>
          {_.map(
            _.sortBy(lesson?.lessonquizzes, 'lessonquizorder'),
            d => {
              return renderLessonQuiz(d as LessonQuiz);
            },
          )}
        </Row>
      </Column>
    );
  };

  if (!lessonId) return <Redirect href="/home/subjects" />;

  if (_.isEmpty(lesson))
    return isCorporate ? (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    ) : (
      <DefaultBackgroundImage />
    );

  if (isCorporate) {
    // Corporate Lesson screen, v2.1 §3b: one "In this lesson" list in
    // hierarchy order (all learnings, then practices, then quizzes), not
    // three sectioned lists — see LessonStepRow. Status per row (and
    // per-item progress for learnings) comes from the activityProgress
    // store, kept fresh by useActivityProgress (fetched on mount + focus,
    // merged offline-safe). The lesson-detail fetch's own
    // studentlearningprogress is dead for this purpose — it's never
    // returned by fetchChapters — so it isn't read here.
    const sortedLearnings = _.sortBy(
      lesson?.lessonlearnings,
      'lessonlearningorder',
    );
    const sortedPractices = _.sortBy(
      lesson?.lessonpractices,
      'lessonpracticeorder',
    );
    const quizzes: LessonQuiz[] = _.sortBy(
      lesson?.lessonquizzes,
      'lessonquizorder',
    );

    type StepActivity = {
      id: string;
      type: 'learning' | 'practice' | 'quiz';
      /** 1-based position within its own type, for "N of M" eyebrows/labels. */
      indexInType: number;
      countInType: number;
      name: string;
    };

    const steps: StepActivity[] = [
      ...sortedLearnings.map((ll, i) => ({
        id: ll.lessonlearningid,
        type: 'learning' as const,
        indexInType: i + 1,
        countInType: sortedLearnings.length,
        name: ll.lessonlearningname,
      })),
      ...sortedPractices.map((lp, i) => ({
        id: lp.lessonpracticeid,
        type: 'practice' as const,
        indexInType: i + 1,
        countInType: sortedPractices.length,
        name: lp.lessonpracticename,
      })),
      ...quizzes.map((lq, i) => ({
        id: lq.lessonquizid,
        type: 'quiz' as const,
        indexInType: i + 1,
        countInType: quizzes.length,
        name: lq.lessonquizname,
      })),
    ];

    // "Next step": the first activity, in learnings -> practices -> quizzes
    // order, that isn't done yet. Only that row gets a CTA pill and the 2px
    // border; every other row shows its plain status icon. If everything is
    // done, nextStep is undefined and the footer is hidden.
    const nextStep = steps.find(step => statusFor(step.id) !== 'done');

    // A step only carries its type + its 1-based index within that type —
    // this looks up the actual learning/practice/quiz object to pass to
    // handleItemPress.
    const moduleForStep = (step: StepActivity) =>
      step.type === 'learning'
        ? sortedLearnings[step.indexInType - 1]
        : step.type === 'practice'
        ? sortedPractices[step.indexInType - 1]
        : quizzes[step.indexInType - 1];

    const lessonImageUrl = getRemoteResourceUrl(
      `lesson-${lesson.lessonid}.jpg`,
    );

    // Header meta: "Grade · Level · N videos · N practices · N quizzes",
    // omitting zero-count parts. Grade/level come from the persisted
    // selection, not the lesson response.
    const metaParts = [
      selectedCourse?.gradename,
      selectedUnit?.levelname,
      sortedLearnings.length > 0
        ? t('screen.lesson.metaVideos', { count: sortedLearnings.length })
        : undefined,
      sortedPractices.length > 0
        ? t('screen.lesson.metaPractices', { count: sortedPractices.length })
        : undefined,
      quizzes.length > 0
        ? t('screen.lesson.metaQuizzes', { count: quizzes.length })
        : undefined,
    ].filter((part): part is string => !!part);

    const stepTypeLabel = (type: StepActivity['type']) =>
      t(`screen.lesson.stepType.${type}`);

    const eyebrowFor = (step: StepActivity) =>
      step.countInType > 1
        ? t('screen.lesson.stepEyebrowWithCount', {
            type: stepTypeLabel(step.type),
            i: step.indexInType,
            n: step.countInType,
          })
        : stepTypeLabel(step.type);

    const titleFor = (step: StepActivity) => {
      if (step.type === 'learning') return step.name;
      const count = questionCountFor(step.id);
      if (count == null) return step.name;
      return step.type === 'practice'
        ? t('screen.lesson.practiceQuestions', { count })
        : t('screen.lesson.quizQuestions', { count });
    };

    const statusTextFor = (step: StepActivity, unsynced: boolean) => {
      const status = statusFor(step.id);
      if (unsynced && status === 'done') return t('screen.lesson.status.unsynced');
      if (status === 'done')
        return step.type === 'learning'
          ? t('screen.lesson.status.learningDone')
          : t('screen.lesson.status.done');
      if (status === 'inProgress') return t('screen.lesson.status.inProgress');
      // todo
      return step.type === 'quiz'
        ? t('screen.lesson.status.quizTodo')
        : t('screen.lesson.status.todo');
    };

    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ alignItems: 'center' }}>
          <View
            style={{
              width: '100%',
              maxWidth: 1024,
              paddingHorizontal: theme.layouts.pageHorizontalPadding,
              paddingTop: theme.layouts.pageVerticalPadding,
              gap: 14,
            }}>
            <View style={{ flexDirection: 'row' }}>
              <View
                style={{
                  minHeight: 24,
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.lessonChip,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text
                  style={{
                    fontFamily: chipFontFamily,
                    fontSize: chipFontSize,
                    lineHeight: chipLineHeight,
                    color: theme.colors.onPrimary,
                  }}>
                  {t('screen.level.lessonChip', { n: lesson.lessonorder ?? '·' })}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontFamily: screenTitleType.fontFamily,
                fontSize: screenTitleType.fontSize,
                lineHeight: screenTitleType.lineHeight,
                color: theme.colors.onBackground,
              }}>
              {lesson.lessonname}
            </Text>
            {metaParts.length > 0 && (
              <Text
                style={{
                  fontFamily: bodyFontFamily,
                  fontSize: bodyType.fontSize,
                  lineHeight: bodyType.lineHeight,
                  color: theme.colors.onSurfaceVariant,
                }}>
                {metaParts.join(' · ')}
              </Text>
            )}
            <Text
              style={{
                fontFamily: cardTitleType.fontFamily,
                fontSize: cardTitleType.fontSize,
                lineHeight: cardTitleType.lineHeight,
                color: theme.colors.onBackground,
                marginTop: 10,
              }}>
              {t('screen.lesson.inThisLesson')}
            </Text>
            <View style={{ gap: 10, paddingBottom: 12 }}>
              {steps.map(step => {
                const isNext = step.id === nextStep?.id;
                const status = statusFor(step.id);
                const unsynced = unsyncedFor(step.id);
                const ctaLabel = isNext
                  ? status === 'inProgress'
                    ? t('cta.continue')
                    : t('cta.start')
                  : undefined;
                const statusText = statusTextFor(step, unsynced);
                // Omit " i of n" when there's only one of this type — same
                // rule as eyebrowFor.
                const a11yLabel = t(
                  step.countInType > 1
                    ? 'screen.lesson.stepA11yLabel'
                    : 'screen.lesson.stepA11yLabelSingle',
                  {
                    type: stepTypeLabel(step.type),
                    i: step.indexInType,
                    n: step.countInType,
                    title: titleFor(step),
                    status: ctaLabel ?? statusText,
                  },
                );
                const onPress = () => handleItemPress(moduleForStep(step), step.type);
                return (
                  <LessonStepRow
                    key={step.id}
                    testID={`activity-row-${step.type}-${step.id}`}
                    type={step.type}
                    eyebrow={eyebrowFor(step)}
                    title={titleFor(step)}
                    statusText={statusText}
                    status={status}
                    isNext={isNext}
                    ctaLabel={ctaLabel}
                    unsynced={unsynced}
                    imageSource={
                      step.type === 'learning' && lessonImageUrl
                        ? { uri: lessonImageUrl }
                        : undefined
                    }
                    onPress={onPress}
                    accessibilityLabel={a11yLabel}
                    accessibilityHint={
                      isNext ? t('screen.level.upNextHint') : undefined
                    }
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
        {nextStep && (
          <View
            style={{
              width: '100%',
              paddingHorizontal: theme.layouts.pageHorizontalPadding,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, theme.layouts.pageVerticalPadding),
              borderTopWidth: 1,
              borderTopColor: theme.colors.divider,
              alignItems: 'center',
            }}>
            <View style={{ width: '100%', maxWidth: 1024 }}>
              <AppButton
                size="lg"
                label={t(
                  nextStep.countInType > 1
                    ? 'screen.lesson.footerCtaWithIndex'
                    : 'screen.lesson.footerCta',
                  {
                    verb:
                      statusFor(nextStep.id) === 'inProgress'
                        ? t('cta.continue')
                        : t('cta.start'),
                    type: stepTypeLabel(nextStep.type),
                    i: nextStep.indexInType,
                  },
                )}
                fullWidth
                onPress={() =>
                  handleItemPress(moduleForStep(nextStep), nextStep.type)
                }
              />
            </View>
          </View>
        )}
      </LayoutScrollView>
    );
  }

  console.log(sectionData);
  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      {/* <SectionList
        style={{ flex: 1, width: '100%' }}
        sections={sectionData}
        keyExtractor={KeyExtractorHelper}
        renderSectionHeader={renderSection}
        initialNumToRender={3}
        renderItem={() => <SizedBox width={0} height={0} />}
      /> */}
      <ScrollView style={{ flex: 1, width: '100%' }}>
        {renderLessonSection()}
        {renderPracticeSection()}
        {renderQuizSection()}
      </ScrollView>
    </LayoutScrollView>
  );
}
