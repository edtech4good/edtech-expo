import {
  DashboardCard,
  DefaultBackgroundImage,
  LayoutScrollView,
  SizedBox,
} from '@/components';
import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { DashboardCardColors } from '@/constants';
import { useTheme } from 'styled-components/native';
import { FlatList, useWindowDimensions } from 'react-native';
import { useBreakpoint } from '@/services';
import { KeyExtractorHelper } from '@/utils';
import { useCourse } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedSubject } from '@/redux/slices';
import { Course } from '@/models';
import { useTranslation } from 'react-i18next';

export default function CourseSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const selectedSubject = useAppSelector(getSelectedSubject);
  const { fetch, clear, selectCourse, courses } = useCourse(
    selectedSubject?.curriculumid || '',
  );

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
    fetch();

    return () => {
      clear();
    };
  }, []);

  const handleItemPress = async (course: Course) => {
    await selectCourse(course);
    router.navigate('/home/units');
  };

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
