import {
  Column,
  DefaultBackgroundImage,
  H4,
  LayoutScrollView,
  Row,
} from '@/components';
import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from 'styled-components/native';
import LessonItem from './components/LessonItem';
import { useLesson } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLesson } from '@/redux/slices';
import { LessonLearning, LessonPractice, LessonQuiz } from '@/models';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

type ActivityType = 'learning' | 'practice' | 'quiz';

const routers = {
  learning: 'home/lessons/1',
  practice: 'home/practices/1',
  quiz: 'home/quizzes/1',
};

export default function LessonSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const selectedLesson = useAppSelector(getSelectedLesson);
  const { fetch, clear, selectModule, lesson } = useLesson(
    selectedLesson?.lessonid || '',
  );

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
      { type: 'learning' as const, title: t('screen.lesson.learningTitle'), data: lesson.lessonlearnings },
      { type: 'practice' as const, title: t('screen.lesson.practiceTitle'), data: lesson.lessonpractices },
      { type: 'quiz' as const, title: t('screen.lesson.quizTitle'), data: lesson.lessonquizzes },
    ];
  }, [lesson, t]);

  useEffect(() => {
    navigation.setOptions({ title: t('screen.lesson.header') });
  }, []);

  useEffect(() => {
    fetch();

    return () => {
      clear();
    };
  }, []);

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
          {_.map(lesson?.lessonquizzes, d => {
            return renderLessonQuiz(d as LessonQuiz);
          })}
        </Row>
      </Column>
    );
  };

  if (_.isEmpty(lesson)) return <DefaultBackgroundImage />;

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
