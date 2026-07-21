import {
  DefaultBackgroundImage,
  LayoutScrollView,
  ProgressCard,
  SizedBox,
} from '@/components';
import { useEffect } from 'react';
import { useTheme } from 'styled-components/native';
import { UnitCardColors } from '@/constants';
import { FlatList, useWindowDimensions } from 'react-native';
import { KeyExtractorHelper } from '@/utils';
import { useBreakpoint } from '@/services';
import {
  Redirect,
  router,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useLevel } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedUnit } from '@/redux/slices';
import { Lesson } from '@/models';
import { useTranslation } from 'react-i18next';

export default function LevelSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ levelid?: string }>();
  const selectedUnit = useAppSelector(getSelectedUnit);
  // The URL param survives a browser reload on web; the redux selection covers
  // native, where navigate() is not always given params by older code paths.
  const levelId =
    (typeof params.levelid === 'string' && params.levelid) ||
    selectedUnit?.levelid ||
    '';
  const { fetch, clear, selectLesson, lessons } = useLevel(levelId);

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
    if (!levelId) return;
    fetch();
    return () => {
      clear();
    };
  }, [levelId]);

  const handleItemPress = async (lesson: Lesson) => {
    await selectLesson(lesson);
    router.navigate({
      pathname: '/home/lessons',
      params: { lessonid: lesson.lessonid },
    });
  };

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

  if (!levelId) return <Redirect href="/home/subjects" />;

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
