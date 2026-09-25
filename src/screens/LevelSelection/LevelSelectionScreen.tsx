import { Images } from '@/assets';
import {
  AppButton,
  DefaultBackgroundImage,
  LayoutScrollView,
  LessonRow,
  ProgressBar,
  ProgressCard,
  SizedBox,
} from '@/components';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'styled-components/native';
import { UnitCardColors } from '@/constants';
import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { KeyExtractorHelper, getRemoteResourceUrl } from '@/utils';
import { useBreakpoint, useDesign, useFont, useTypeRole } from '@/services';
import {
  Redirect,
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useLevel, useLevelHeader } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage, getSelectedUnit } from '@/redux/slices';
import { Lesson } from '@/models';
import { useTranslation } from 'react-i18next';
import type { LessonRowStatus, LessonStepDotsProps } from '@/components/ui';

// The server flags a lesson `completed` once it clears the lesson's pass
// mark (e.g. 80/100 points) — that can happen before `progress` reaches 100.
// Older/cached responses may lack the flag, so fall back to the previous
// `progress >= 100` behavior when it is absent.
const isLessonDone = (lesson: Lesson): boolean =>
  lesson.completed === true || (lesson.progress ?? 0) >= 100;

// The /level/<id> response carries one aggregate progress per lesson —
// nothing per-step (see the Lesson model: lessonlearnings/practices/quizzes
// carry only names and orders). Until the API exposes per-step completion,
// the dots are a coarse, monotonic approximation: a finished lesson is all
// done; a started lesson is presumed to have finished Learning and be in
// Practice; the up-next untouched lesson starts at Learning.
function approximateSteps(
  progress: number,
  isNext: boolean,
  done: boolean,
): LessonStepDotsProps['steps'] {
  if (done) return { learning: 'done', practice: 'done', quiz: 'done' };
  if (progress > 0)
    return { learning: 'done', practice: 'current', quiz: 'todo' };
  if (isNext) return { learning: 'current', practice: 'todo', quiz: 'todo' };
  return { learning: 'todo', practice: 'todo', quiz: 'todo' };
}

const LessonRowSpacer = () => <View style={{ height: 10 }} />;

export default function LevelSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const bodyFont = useFont('normal', 'body');
  const bodyFontSemi = useFont('semi', 'body');
  // design v2.1 Khmer type scale roles.
  const screenTitleType = useTypeRole('screenTitle');
  const bodyType = useTypeRole('body');
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  // Chip/progress micro-labels: Khmer floor — never below 13px.
  const microFontSize = isKhmer ? 13 : 12;
  const microLineHeight = isKhmer ? 20 : undefined;
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
  // Tracks whether the remote hero image failed to load, so we can fall
  // back to the static asset. Declared unconditionally alongside the other
  // hooks — this screen has an early `if (!levelId) return <Redirect …>`
  // below, and hooks must never run conditionally.
  const [heroLoadFailed, setHeroLoadFailed] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: t('screen.level.header') });
  }, []);

  useEffect(() => {
    if (!levelId) return;
    setHeroLoadFailed(false);
    return () => {
      clear();
    };
  }, [levelId]);

  // Reload the lesson list every time this screen regains focus (e.g.
  // returning from a quiz), not only on first mount — otherwise a lesson
  // just completed still shows its stale pre-quiz state. Deliberately does
  // not clear the list on blur, which would blank the screen while the
  // refetch is in flight when the user comes back.
  useFocusEffect(
    useCallback(() => {
      if (!levelId) return;
      let active = true;
      fetch(() => active);
      return () => {
        active = false;
      };
    }, [levelId]),
  );

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
    // chip row, title, level progress, lesson rows with status icon + step
    // dots, sticky Start/Continue footer. No locked state on purpose —
    // the product has no lesson gating today.
    const sortedLessons = [...lessons].sort(
      (a, b) => (a.lessonorder ?? 0) - (b.lessonorder ?? 0),
    );
    const doneCount = sortedLessons.filter(isLessonDone).length;
    const upNext = sortedLessons.find(l => !isLessonDone(l));
    const levelProgress = Math.min(
      100,
      Math.max(0, Math.round(headerUnit?.progress ?? 0)),
    );

    const statusFor = (lesson: Lesson): LessonRowStatus => {
      if (isLessonDone(lesson)) return 'done';
      if ((lesson.progress ?? 0) > 0) return 'inProgress';
      return 'todo';
    };

    const upNextProgress = upNext?.progress ?? 0;
    const upNextCtaLabel =
      upNextProgress > 0 ? t('cta.continue') : t('cta.start');
    const upNextOrder = upNext?.lessonorder;
    // Fall back to the plain "Continue"/"Start" CTA when the lesson number
    // is missing — "Continue Lesson " with a blank number reads as broken.
    const footerCtaLabel =
      upNextOrder != null
        ? upNextProgress > 0
          ? t('cta.continueLesson', { n: upNextOrder })
          : t('cta.startLesson', { n: upNextOrder })
        : upNextCtaLabel;

    // A broken remote image would blank the illustration that today always
    // shows, so (unlike the curriculum cards) this needs an explicit
    // runtime fallback: try the remote asset, and drop back to the bundled
    // one on load failure or when no remote URL is resolvable at all. The
    // handoff (§3) shrank this from a 220px photo hero to a 110px inset
    // illustration, but the image source itself is unchanged.
    const remoteHeroUrl = getRemoteResourceUrl(`level-${levelId}.jpg`);
    const illustrationSource =
      remoteHeroUrl && !heroLoadFailed
        ? { uri: remoteHeroUrl }
        : Images.CorporateCourseHero;

    // v2 §3: grey category chip + lessonChip-colored "Grade · Level" chip,
    // both H24/12px — the shared `Chip` component is H32/36 and colors its
    // active state with `primary`, so these are the handoff's small pill
    // built directly (matches the "Lesson N" chip on LessonRow).
    const detailHeader = (
      <View style={{ paddingBottom: theme.layouts.pageVerticalPadding }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {headerGradeName != null && (
            <View
              style={{
                minHeight: 24,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.surfaceVariant,
                paddingHorizontal: 10,
                paddingVertical: 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  fontFamily: bodyFont,
                  fontSize: microFontSize,
                  lineHeight: microLineHeight,
                  color: theme.colors.onSurface,
                }}>
                {headerGradeName}
              </Text>
            </View>
          )}
          {headerUnit?.levelname != null && (
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
                  fontFamily: bodyFont,
                  fontSize: microFontSize,
                  lineHeight: microLineHeight,
                  color: theme.colors.onPrimary,
                }}>
                {headerUnit.levelname}
              </Text>
            </View>
          )}
        </View>
        {/* Header-section spacing per the review pass: 14 between sections
            (chip row → title, description → illustration, illustration →
            progress), not the shared 12px SizedBox.Medium — scoped here so
            other SizedBox.Medium consumers are untouched. */}
        <View style={{ height: 14 }} />
        <Text
          style={{
            fontFamily: screenTitleType.fontFamily,
            fontSize: screenTitleType.fontSize,
            lineHeight: screenTitleType.lineHeight,
            color: theme.colors.onBackground,
          }}>
          {headerUnit?.levelname ?? ''}
        </Text>
        {headerUnit?.leveldescription ? (
          <View style={{ marginTop: 14 }}>
            <Text
              style={{
                fontFamily: bodyFont,
                fontSize: bodyType.fontSize,
                lineHeight: bodyType.lineHeight,
                color: theme.colors.onSurface,
              }}>
              {headerUnit.leveldescription}
            </Text>
          </View>
        ) : null}
        <View style={{ height: 14 }} />
        <Image
          source={illustrationSource}
          onError={() => setHeroLoadFailed(true)}
          contentFit="cover"
          contentPosition="top"
          style={{
            width: '100%',
            height: 110,
            borderRadius: theme.radii.card,
          }}
        />
        <View style={{ height: 14 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          <Text
            style={{
              fontFamily: bodyFontSemi,
              fontSize: microFontSize,
              lineHeight: microLineHeight,
              color: theme.colors.onSurface,
            }}>
            {t('screen.level.progressWithCertificate', {
              done: doneCount,
              total: sortedLessons.length,
            })}
          </Text>
          <Text
            style={{
              fontFamily: bodyFontSemi,
              fontSize: microFontSize,
              lineHeight: microLineHeight,
              color: theme.colors.onSurface,
            }}>
            {`${levelProgress}%`}
          </Text>
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
              const isNext = item.lessonid === upNext?.lessonid;
              return (
                <LessonRow
                  chipLabel={t('screen.level.lessonChip', {
                    n: item.lessonorder ?? '·',
                  })}
                  title={item.lessonname}
                  status={status}
                  isNext={isNext}
                  ctaLabel={isNext ? upNextCtaLabel : undefined}
                  steps={approximateSteps(item.progress ?? 0, isNext, status === 'done')}
                  onPress={() => handleItemPress(item)}
                  testID={`lesson-row-${item.lessonid}`}
                />
              );
            }}
            keyExtractor={KeyExtractorHelper}
          />
          {upNext && (
            <View
              style={{
                paddingHorizontal: theme.layouts.pageHorizontalPadding,
                paddingTop: 12,
                paddingBottom: theme.layouts.pageVerticalPadding,
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
              }}>
              <AppButton
                label={footerCtaLabel}
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
