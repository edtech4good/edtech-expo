import {
  CorporateCardGrid,
  DashboardCard,
  DefaultBackgroundImage,
  LayoutScrollView,
  SizedBox,
} from '@/components';
import {
  Redirect,
  router,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useEffect } from 'react';
import { DashboardCardColors } from '@/constants';
import { useTheme } from 'styled-components/native';
import { FlatList, useWindowDimensions } from 'react-native';
import { useBreakpoint, useDesign, useProgressSummary } from '@/services';
import { KeyExtractorHelper, getRemoteResourceUrl } from '@/utils';
import { useCourse } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedSubject } from '@/redux/slices';
import { Course, findGradeProgress } from '@/models';
import { useTranslation } from 'react-i18next';

// Corporate grade cards. Each card's % pill and bar come from the same
// progress summary as My progress / Home (lessons completed / all lessons in
// the grade), matched by gradeid. No summary row (not loaded yet, or the API
// build predates the grades breakdown) means no pill and no bar; the
// server's points-based `course.progress` is no longer shown. Its own
// component so the summary fetch only runs on the corporate branch.
function CorporateCourseGrid({
  courses,
  onPress,
}: {
  courses: Course[];
  onPress: (course: Course) => void;
}) {
  const { summary } = useProgressSummary();
  const curricula = summary?.curricula ?? [];

  return (
    <CorporateCardGrid
      items={courses.map(course => {
        const remoteUrl = getRemoteResourceUrl(`grade-${course.gradeid}.jpg`);
        const grade = findGradeProgress(curricula, course.gradeid);
        return {
          key: course.gradeid,
          title: course.gradename,
          meta: course.gradedescription,
          progress: grade === undefined ? undefined : grade.percent / 100,
          imageSource: remoteUrl ? { uri: remoteUrl } : undefined,
          onPress: () => onPress(course),
        };
      })}
    />
  );
}

export default function CourseSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ curriculumid?: string }>();
  const selectedSubject = useAppSelector(getSelectedSubject);
  // The URL param survives a browser reload on web; the redux selection covers
  // native, where navigate() is not always given params by older code paths.
  const curriculumId =
    (typeof params.curriculumid === 'string' && params.curriculumid) ||
    selectedSubject?.curriculumid ||
    '';
  const { fetch, clear, selectCourse, courses } = useCourse(curriculumId);

  const { width } = useWindowDimensions();
  const numOfColumn = useBreakpoint({
    mobile: 2,
    phablet: 3,
    tablet: 5,
    desktop: Math.floor(
      (width - theme.layouts.large) / (227 + theme.layouts.large),
    ),
  });

  useEffect(() => {
    navigation.setOptions({ title: t('screen.course.header') });
  }, []);

  useEffect(() => {
    if (!curriculumId) return;
    fetch();

    return () => {
      clear();
    };
  }, [curriculumId]);

  const handleItemPress = async (course: Course) => {
    await selectCourse(course);
    router.navigate({
      pathname: '/home/units',
      params: { gradeid: course.gradeid },
    });
  };

  if (!curriculumId) return <Redirect href="/home/subjects" />;

  if (isCorporate) {
    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <CorporateCourseGrid courses={courses} onPress={handleItemPress} />
      </LayoutScrollView>
    );
  }

  const renderItemSeparator = () => <SizedBox.Large height />;

  const renderItem = ({ item, index }: { item: Course; index: number }) => {
    const imageIndex = index % DashboardCardColors.length;
    return (
      <DashboardCard
        themeIndex={imageIndex}
        title={item.gradename}
        description={item.gradedescription}
        onPress={() => handleItemPress(item)}
      />
    );
  };

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <FlatList
        key={numOfColumn}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
        }}
        data={courses}
        numColumns={numOfColumn}
        ListHeaderComponent={renderItemSeparator}
        renderItem={renderItem}
        keyExtractor={KeyExtractorHelper}
      />
    </LayoutScrollView>
  );
}
