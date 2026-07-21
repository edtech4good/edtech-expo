import {
  CorporateCardGrid,
  DefaultBackgroundImage,
  LayoutScrollView,
  normalizeProgressFraction,
  ProgressCard,
  SizedBox,
} from '@/components';
import { useEffect } from 'react';
import { useTheme } from 'styled-components/native';
import { UnitCardColors } from '@/constants';
import { FlatList, useWindowDimensions } from 'react-native';
import { KeyExtractorHelper } from '@/utils';
import { useBreakpoint, useDesign } from '@/services';
import { router, useNavigation } from 'expo-router';
import { useLevel } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedUnit } from '@/redux/slices';
import { Lesson } from '@/models';
import { useTranslation } from 'react-i18next';

export default function LevelSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const navigation = useNavigation();
  const selectedUnit = useAppSelector(getSelectedUnit);
  const { fetch, clear, selectLesson, lessons } = useLevel(
    selectedUnit?.levelid || '',
  );

  const { width } = useWindowDimensions();
  const numOfColumn = useBreakpoint({
    mobile: 2,
    tablet: 3,
    phablet: 2,
    desktop: Math.floor(
      (width - theme.layouts.large) / (395 + theme.layouts.large),
    ),
  });

  useEffect(() => {
    navigation.setOptions({ title: t('screen.level.header') });
  }, []);

  useEffect(() => {
    fetch();
    return () => {
      clear();
    };
  }, [selectedUnit]);

  const handleItemPress = async (lesson: Lesson) => {
    await selectLesson(lesson);
    router.navigate('/home/lessons');
  };

  if (isCorporate) {
    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <CorporateCardGrid
          items={lessons.map(lesson => ({
            key: lesson.lessonid,
            title: lesson.lessonname,
            meta: lesson.lessondescription,
            progress: normalizeProgressFraction(lesson.progress),
            onPress: () => handleItemPress(lesson),
          }))}
        />
      </LayoutScrollView>
    );
  }

  const renderItemSeparator = () => <SizedBox.Large height />;

  const renderItem = ({ item, index }: { item: Lesson; index: number }) => {
    const imageIndex = index % UnitCardColors.length;
    return (
      <ProgressCard
        themeIndex={imageIndex}
        title={item.lessonname}
        description={item.lessondescription}
        progress={item.progress}
        // numberOfColumn={numOfColumn}
        onPress={() => handleItemPress(item)}
      />
    );
  };

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <FlatList
        key={numOfColumn}
        style={{
          flex: 1,
          width: '100%',
        }}
        numColumns={numOfColumn}
        data={lessons}
        ListHeaderComponent={renderItemSeparator}
        renderItem={renderItem}
        keyExtractor={KeyExtractorHelper}
        showsVerticalScrollIndicator={false}
      />
    </LayoutScrollView>
  );
}
