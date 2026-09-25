import {
  Column,
  ContinueLearningRow,
  DefaultBackgroundImage,
  EyebrowText,
  H4,
  LayoutScrollView,
  Row,
} from '@/components';
import {
  Redirect,
  router,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import LessonItem from './components/LessonItem';
import { useActivityProgress, useDesign, useLesson } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLesson } from '@/redux/slices';
import { LessonLearning, LessonPractice, LessonQuiz } from '@/models';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { getRemoteResourceUrl } from '@/utils';
import type { ImageProps } from 'expo-image';
import type { StatusIconStatus } from '@/components/ui';

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

  const params = useLocalSearchParams<{ lessonid?: string }>();
  const selectedLesson = useAppSelector(getSelectedLesson);
  // The URL param survives a browser reload on web; the redux selection covers
  // native, where navigate() is not always given params by older code paths.
  const lessonId =
    (typeof params.lessonid === 'string' && params.lessonid) ||
    selectedLesson?.lessonid ||
    '';
  const { fetch, clear, selectModule, lesson } = useLesson(lessonId);
  const { statusFor, progressFor } = useActivityProgress(lessonId);

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
    // Corporate lesson-content screen: the same three activity sections,
    // restyled as eyebrow headers + row cards. Status per row (and per-item
    // progress for learnings) comes from the activityProgress store, kept
    // fresh by useActivityProgress (fetched on mount + focus, merged
    // offline-safe). The lesson-detail fetch's own
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

    // "Next activity": the first activity, in learnings -> practices ->
    // quizzes order, that isn't done yet. Only that row gets a CTA pill;
    // every other row shows its plain status icon. If everything is done,
    // nextActivityId is undefined and no row gets a pill.
    const orderedActivityIds = [
      ...sortedLearnings.map(ll => ll.lessonlearningid),
      ...sortedPractices.map(lp => lp.lessonpracticeid),
      ...quizzes.map(lq => lq.lessonquizid),
    ];
    const nextActivityId = orderedActivityIds.find(
      id => statusFor(id) !== 'done',
    );

    const doneCount = (ids: string[]) =>
      ids.filter(id => statusFor(id) === 'done').length;

    const trailingFor = (
      activityId: string,
    ): { status?: StatusIconStatus; ctaLabel?: string } => {
      if (activityId === nextActivityId) {
        return {
          ctaLabel:
            statusFor(activityId) === 'inProgress'
              ? t('cta.continue')
              : t('cta.start'),
        };
      }
      return { status: statusFor(activityId) };
    };

    const corporateSection = (
      title: string,
      type: 'learning' | 'practice' | 'quiz',
      ids: string[],
      rows: Array<{
        key: string;
        title: string;
        progress?: number;
        imageSource?: ImageProps['source'];
        onPress: () => void;
      }>,
    ) => {
      const done = doneCount(ids);
      const total = ids.length;
      return (
        total > 0 && (
          <View style={{ gap: 12 }}>
            <EyebrowText
              size={10}
              color={theme.colors.primary}
              testID={`activity-section-${type}`}
              accessibilityLabel={`${title}, ${t(
                'screen.lesson.sectionCountA11y',
                { done, total },
              )}`}>
              {`${title} · ${t('screen.lesson.sectionCount', { done, total })}`}
            </EyebrowText>
            {rows.map(({ key, ...row }) => (
              <ContinueLearningRow
                key={key}
                testID={`activity-row-${type}-${key}`}
                trailing={trailingFor(key)}
                {...row}
              />
            ))}
          </View>
        )
      );
    };

    const lessonImageUrl = getRemoteResourceUrl(
      `lesson-${lesson.lessonid}.jpg`,
    );

    const learningIds = sortedLearnings.map(ll => ll.lessonlearningid);
    const practiceIds = sortedPractices.map(lp => lp.lessonpracticeid);
    const quizIds = quizzes.map(lq => lq.lessonquizid);
    const totalActivities = orderedActivityIds.length;
    const totalDone = doneCount(orderedActivityIds);

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
              paddingVertical: theme.layouts.pageVerticalPadding,
              gap: 24,
            }}>
            {totalActivities > 0 && (
              <EyebrowText
                size={11}
                color={theme.colors.onSurfaceVariant}
                testID="lesson-activities-summary">
                {t('screen.lesson.activitiesDone', {
                  done: totalDone,
                  total: totalActivities,
                })}
              </EyebrowText>
            )}
            {corporateSection(
              t('screen.lesson.learningTitle'),
              'learning',
              learningIds,
              sortedLearnings.map(ll => ({
                key: ll.lessonlearningid,
                title: ll.lessonlearningname,
                progress:
                  statusFor(ll.lessonlearningid) === 'inProgress' &&
                  (progressFor(ll.lessonlearningid) ?? 0) > 0
                    ? Math.min(1, (progressFor(ll.lessonlearningid) ?? 0) / 100)
                    : undefined,
                imageSource: lessonImageUrl
                  ? { uri: lessonImageUrl }
                  : undefined,
                onPress: () => handleItemPress(ll, 'learning'),
              })),
            )}
            {corporateSection(
              t('screen.lesson.practiceTitle'),
              'practice',
              practiceIds,
              sortedPractices.map(lp => ({
                key: lp.lessonpracticeid,
                title: lp.lessonpracticename,
                imageSource: lessonImageUrl
                  ? { uri: lessonImageUrl }
                  : undefined,
                onPress: () => handleItemPress(lp, 'practice'),
              })),
            )}
            {corporateSection(
              t('screen.lesson.quizTitle'),
              'quiz',
              quizIds,
              quizzes.map(lq => ({
                key: lq.lessonquizid,
                title: lq.lessonquizname,
                imageSource: lessonImageUrl
                  ? { uri: lessonImageUrl }
                  : undefined,
                onPress: () => handleItemPress(lq, 'quiz'),
              })),
            )}
          </View>
        </ScrollView>
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
