import {
  AppTextField,
  CorporateCardGrid,
  DashboardCard,
  DefaultBackgroundImage,
  EyebrowText,
  LayoutScrollView,
  normalizeProgressFraction,
  SizedBox,
} from '@/components';
import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { DashboardCardColors } from '@/constants';
import { useTheme } from 'styled-components/native';
import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import { useAuth, useBreakpoint, useDesign, useFont } from '@/services';
import { KeyExtractorHelper } from '@/utils';
import { useSubject } from '@/services';
import { Subject } from '@/models';
import { useTranslation } from 'react-i18next';

export default function CourseSelectionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const { profile } = useAuth();
  const displayFont = useFont('bold', 'display');
  const [query, setQuery] = useState('');
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
    router.navigate('/home/courses');
  };

  const renderItemSeparator = () => <SizedBox.Large height />;

  if (isCorporate) {
    // Corporate Home/Curricula per the handoff (§2/§6), tablet/web-first:
    // greeting header, search pill (client-side filter — the API has no
    // search endpoint), curriculum card grid. Category chips and the
    // continue-learning row are deferred: curricula carry no category data,
    // and no endpoint exposes "resume where you left off" yet (the JWT's
    // studentcurrentlessonid/levelid claims are typed but unpopulated).
    const trimmedQuery = query.trim().toLowerCase();
    const visibleSubjects = trimmedQuery
      ? subjects.filter(s =>
          (s.curriculumname ?? '').toLowerCase().includes(trimmedQuery),
        )
      : subjects;

    const studentName = [profile?.studentfirstname, profile?.studentlastname]
      .filter(Boolean)
      .join(' ');

    // The greeting/search header is a SIBLING of the grid's FlatList, not
    // its ListHeaderComponent: header cells re-mount inside VirtualizedList
    // when the list re-renders per keystroke, which tears down the search
    // field's DOM node and drops focus after every character typed.
    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <View style={{ flex: 1, width: '100%', maxWidth: 1024 }}>
          <View
            style={{
              paddingHorizontal: theme.layouts.pageHorizontalPadding,
              paddingVertical: theme.layouts.pageVerticalPadding,
            }}>
            <EyebrowText size={10} color={theme.colors.primary}>
              {t('screen.subject.greeting')}
            </EyebrowText>
            {studentName !== '' && (
              <Text
                style={{
                  marginTop: 4,
                  fontFamily: displayFont,
                  fontSize: 24,
                  color: theme.colors.onBackground,
                }}>
                {studentName}
              </Text>
            )}
            <SizedBox.Medium height />
            <AppTextField
              variant="search"
              value={query}
              onChangeText={setQuery}
              placeholder={t('screen.subject.searchPlaceholder')}
            />
          </View>
          <CorporateCardGrid
            items={visibleSubjects.map(subject => ({
              key: subject.curriculumid,
              title: subject.curriculumname,
              meta: subject.curriculumdescription,
              progress: normalizeProgressFraction(subject.progress),
              onPress: () => handleItemPress(subject),
            }))}
          />
        </View>
      </LayoutScrollView>
    );
  }

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
