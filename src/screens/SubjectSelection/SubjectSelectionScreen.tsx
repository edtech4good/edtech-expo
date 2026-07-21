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
import { useSubject } from '@/services';
import { Subject } from '@/models';
import { useTranslation } from 'react-i18next';

export default function CourseSelectionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { fetch, subjects, selectSubject } = useSubject();

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
    navigation.setOptions({ title: t('screen.subject.header') });
  }, []);

  useEffect(() => {
    fetch();
  }, []);

  const handleItemPress = async (cur: Subject) => {
    await selectSubject(cur);
    router.navigate({
      pathname: '/home/courses',
      params: { curriculumid: cur.curriculumid },
    });
  };

  const renderItemSeparator = () => <SizedBox.Large height />;

  const renderItem = ({ item, index }: { item: Subject; index: number }) => {
    const imageIndex = index % DashboardCardColors.length;
    return (
      <DashboardCard
        themeIndex={imageIndex}
        title={item.curriculumname}
        description={item.curriculumdescription}
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
        data={subjects}
        numColumns={numOfColumn}
        ListHeaderComponent={renderItemSeparator}
        renderItem={renderItem}
        keyExtractor={KeyExtractorHelper}
      />
    </LayoutScrollView>
  );
}
