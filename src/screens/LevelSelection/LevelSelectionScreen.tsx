import { Images } from '@/assets';
import {
  AppButton,
  Chip,
  DefaultBackgroundImage,
  EyebrowText,
  LayoutScrollView,
  LessonRow,
  ProgressBar,
  ProgressCard,
  SizedBox,
} from '@/components';
import { useEffect } from 'react';
import { useTheme } from 'styled-components/native';
import { UnitCardColors } from '@/constants';
import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { KeyExtractorHelper } from '@/utils';
import { useBreakpoint, useDesign, useFont } from '@/services';
import {
  Redirect,
  router,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useLevel, useLevelHeader } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedUnit } from '@/redux/slices';
import { Lesson } from '@/models';
import { useTranslation } from 'react-i18next';
import type { LessonRowStatus, LessonStepDotsProps } from '@/components/ui';

// The /level/<id> response carries one aggregate progress per lesson —
// nothing per-step (see the Lesson model: lessonlearnings/practices/quizzes
// carry only names and orders). Until the API exposes per-step completion,
// the dots are a coarse, monotonic approximation: a finished lesson is all
// done; a started lesson is presumed to have finished Learning and be in
// Practice; the up-next untouched lesson starts at Learning.
function approximateSteps(
  progress: number,
  isNext: boolean,
): LessonStepDotsProps['steps'] {
  if (progress >= 100) return { learning: 'done', practice: 'done', quiz: 'done' };
  if (progress > 0)
    return { learning: 'done', practice: 'current', quiz: 'todo' };
  if (isNext) return { learning: 'current', practice: 'todo', quiz: 'todo' };
  return { learning: 'todo', practice: 'todo', quiz: 'todo' };
}

const LessonRowSpacer = () => <View style={{ height: 12 }} />;

export default function LevelSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const displayFont = useFont('bold', 'display');
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
  const { unit: headerUnit, gradeName: headerGradeName } = useLevelHeader(
    levelId,
    isCorporate,
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

  if (!levelId) return <Redirect href="/home/subjects" />;

  if (isCorporate) {
    // Corporate Level Detail per the handoff (§3 phone / §7 tablet): hero,
    // chip row, title, level progress, lesson rows with status disc + step
    // dots, sticky Continue-learning footer. No locked state on purpose —
    // the product has no lesson gating today.
    const sortedLessons = [...lessons].sort(
      (a, b) => (a.lessonorder ?? 0) - (b.lessonorder ?? 0),
    );
    const doneCount = sortedLessons.filter(l => (l.progress ?? 0) >= 100)
      .length;
    const upNext = sortedLessons.find(l => (l.progress ?? 0) < 100);
    const levelProgress = Math.min(
      100,
      Math.max(0, Math.round(headerUnit?.progress ?? 0)),
    );

    const statusFor = (lesson: Lesson): LessonRowStatus => {
      if ((lesson.progress ?? 0) >= 100) return 'done';
      if (lesson.lessonid === upNext?.lessonid) return 'next';
      return 'todo';
    };

    const detailHeader = (
      <View style={{ paddingBottom: theme.layouts.pageVerticalPadding }}>
        <Image
          source={Images.CorporateCourseHero}
          contentFit="cover"
          contentPosition="top"
          style={{
            width: '100%',
            height: 220,
            borderRadius: theme.radii.media,
          }}
        />
        <SizedBox.Medium height />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {headerGradeName != null && <Chip label={headerGradeName} />}
          {headerUnit?.levelname != null && (
            <Chip label={headerUnit.levelname} active />
          )}
        </View>
        <SizedBox.Medium height />
        <Text
          style={{
            fontFamily: displayFont,
            fontSize: 22,
            color: theme.colors.onBackground,
          }}>
          {headerUnit?.levelname ?? ''}
        </Text>
        {headerUnit?.leveldescription ? (
          <View style={{ marginTop: 4 }}>
            <EyebrowText size={10}>{headerUnit.leveldescription}</EyebrowText>
          </View>
        ) : null}
        <SizedBox.Medium height />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}>
          <EyebrowText size={10}>
            {t('screen.level.lessonsProgress', {
              done: doneCount,
              total: sortedLessons.length,
            })}
          </EyebrowText>
          <EyebrowText size={10} color={theme.colors.onBackground}>
            {`${levelProgress}%`}
          </EyebrowText>
        </View>
        <ProgressBar progress={levelProgress / 100} height={6} />
      </View>
    );

    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <View style={{ flex: 1, width: '100%', maxWidth: 1024 }}>
          <FlatList
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{
              paddingHorizontal: theme.layouts.pageHorizontalPadding,
              paddingTop: theme.layouts.pageVerticalPadding,
              paddingBottom: theme.layouts.pageVerticalPadding,
            }}
            data={sortedLessons}
            ListHeaderComponent={detailHeader}
            ItemSeparatorComponent={LessonRowSpacer}
            renderItem={({ item }) => {
              const status = statusFor(item);
              return (
                <LessonRow
                  chipLabel={t('screen.level.lessonChip', {
                    n: item.lessonorder ?? '·',
                  })}
                  title={item.lessonname}
                  status={status}
                  steps={approximateSteps(item.progress ?? 0, status === 'next')}
                  onPress={() => handleItemPress(item)}
                />
              );
            }}
            keyExtractor={KeyExtractorHelper}
          />
          {upNext && (
            <View
              style={{
                paddingHorizontal: theme.layouts.pageHorizontalPadding,
                paddingVertical: theme.layouts.pageVerticalPadding,
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
              }}>
              <AppButton
                label={t('screen.level.continueLearning')}
                fullWidth
                onPress={() => handleItemPress(upNext)}
              />
            </View>
          )}
        </View>
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
