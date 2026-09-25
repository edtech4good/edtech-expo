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
import { useLevel, useLevelHeader, useLevelSteps } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage, getSelectedUnit } from '@/redux/slices';
import { Lesson } from '@/models';
import { useTranslation } from 'react-i18next';
import { toStepInfo } from '@/components/ui';
import type { LessonRowStatus, LessonStepDotsProps } from '@/components/ui';

// The server flags a lesson `completed` once it clears the lesson's pass
// mark (e.g. 80/100 points) — that can happen before `progress` reaches 100.
// Older/cached responses may lack the flag, so fall back to the previous
// `progress >= 100` behavior when it is absent. This is now only the
// fallback rule (see `lessonStatusFor` below) — used when the real step
// structure for a lesson hasn't been cached yet, or when a lesson has no
// items in any of the three types.
const isLessonDone = (lesson: Lesson): boolean =>
  lesson.completed === true || (lesson.progress ?? 0) >= 100;

// Jesse, 26 Sep: a lesson row's status must follow its step dots, not the
// server's lesson-level rule — a row could say "Done" with a hollow dot, or
// show three green dots and not be "done", because `isLessonDone` (points
// >= 80%) and the per-step dots were computed independently. This is the
// single source of truth for a lesson's derived status; every consumer on
// this screen (row status, the up-next pick, the header count/%, and the
// footer CTA) must go through it so they can't disagree with each other.
//
// - When the real step structure is known (`stepsFor` returns something):
//   only types with at least one item count. `done` when every such type is
//   `done`; `inProgress` when any item has been started (state `current` or
//   `done`) but not all types are done; `todo` otherwise. A lesson with zero
//   items in all three types falls back to the server rule below — there's
//   nothing to derive a status from.
// - When the structure isn't cached yet (offline first load, before any
//   `lesson/level/:levelid/steps` fetch has succeeded): fall back to the
//   server rule (`isLessonDone` / `progress > 0`).
//
// Because the dots read the same `activityProgress` store that offline
// practice/quiz/video writes land in, a lesson finished offline shows
// "Done" here immediately, without waiting for a server round-trip.
function lessonStatusFor(
  lesson: Lesson,
  steps: LessonStepDotsProps['steps'] | undefined,
): LessonRowStatus {
  if (steps) {
    const withItems = (Object.keys(steps) as Array<keyof typeof steps>)
      .map(key => toStepInfo(steps[key]))
      .filter(info => info.total > 0);
    if (withItems.length > 0) {
      if (withItems.every(info => info.state === 'done')) return 'done';
      if (withItems.some(info => info.state === 'current' || info.state === 'done'))
        return 'inProgress';
      return 'todo';
    }
  }
  if (isLessonDone(lesson)) return 'done';
  if ((lesson.progress ?? 0) > 0) return 'inProgress';
  return 'todo';
}

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
  const params = useLocalSearchParams<{ levelid?: string; from?: string }>();
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
  // Real per-step dots (§ new lesson/level/:levelid/steps endpoint), with a
  // per-lesson fallback to the coarse `approximateSteps` guess below when
  // that lesson's structure hasn't been cached yet (first load offline,
  // before any fetch has succeeded).
  const { stepsFor } = useLevelSteps(isCorporate ? levelId : '');

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

  // Library isn't part of the "home" drill-down Stack, so a level opened
  // from it (Library card → this screen, see LibraryScreen's `from:
  // 'library'` param) has no back-stack entry that points at Library.
  // home/_layout.tsx's `levels` Stack.Screen options are a function of the
  // route and handle the header back button for both cases (library vs.
  // normal drill-down) — see that file for why. This screen only needs to
  // handle *hardware* back / swipe-back, which bypasses the header
  // entirely: when opened `from: 'library'`, intercept a back/pop action
  // and redirect to /library instead of letting it pop into whatever the
  // Home stack happens to hold underneath (see the same reasoning as the
  // header override in home/_layout.tsx). Forward navigation (e.g. into a
  // lesson) is a PUSH, not a removal, so it never reaches this listener.
  useEffect(() => {
    if (params.from !== 'library') return;
    return navigation.addListener('beforeRemove', e => {
      if (
        e.data.action.type !== 'POP' &&
        e.data.action.type !== 'GO_BACK'
      ) {
        return;
      }
      e.preventDefault();
      router.navigate('/library');
    });
  }, [navigation, params.from]);

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
    // Derive every lesson's status once, from its real step structure when
    // it's cached (falling back to the server rule otherwise) — see
    // `lessonStatusFor` above. Row status, the up-next pick, the header
    // count/%, and the footer CTA all read off this same array so they
    // can't disagree with each other.
    const statusedLessons = sortedLessons.map(lesson => {
      const steps = stepsFor(lesson.lessonid);
      return { lesson, steps, status: lessonStatusFor(lesson, steps) };
    });
    const doneCount = statusedLessons.filter(
      ({ status }) => status === 'done',
    ).length;
    const upNextEntry = statusedLessons.find(({ status }) => status !== 'done');
    const upNext = upNextEntry?.lesson;
    // The server's level `progress` is points-based and can disagree with
    // the "N of M lessons" count above it (e.g. "1 of 4 lessons · 100%"
    // when only one of four lessons is actually done) — per the design
    // (spec shows "10 of 16 lessons · 62%"), derive the header % (and its
    // bar) from the same doneCount/total lesson-count rule as the list
    // instead, so the two numbers can never disagree. Kids theme is
    // untouched — it still reads `progress` off each ProgressCard below.
    const levelProgress =
      sortedLessons.length > 0
        ? Math.min(100, Math.round((doneCount / sortedLessons.length) * 100))
        : 0;

    // Footer CTA per Jesse's rule: "Start" only when the up-next lesson's
    // derived status is `todo`; any started work (`inProgress`) reads
    // "Continue". `upNextEntry` is undefined once every lesson is done, so
    // this only matters while the footer is actually shown below.
    const upNextIsStarted = upNextEntry?.status === 'inProgress';
    const upNextCtaLabel = upNextIsStarted ? t('cta.continue') : t('cta.start');
    const upNextOrder = upNext?.lessonorder;
    // Fall back to the plain "Continue"/"Start" CTA when the lesson number
    // is missing — "Continue Lesson " with a blank number reads as broken.
    const footerCtaLabel =
      upNextOrder != null
        ? upNextIsStarted
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
            data={statusedLessons}
            ListHeaderComponent={detailHeader}
            ItemSeparatorComponent={LessonRowSpacer}
            renderItem={({ item: { lesson: item, steps: cachedSteps, status } }) => {
              const isNext = item.lessonid === upNext?.lessonid;
              // The dots themselves still need the raw per-step data (or
              // the coarse estimate) to render — `status` above is already
              // derived from this same lookup via `lessonStatusFor`, so the
              // two can never disagree. `cachedSteps` was already fetched
              // once per lesson above (in `statusedLessons`); reuse it here
              // instead of calling `stepsFor` again.
              const steps =
                cachedSteps ??
                approximateSteps(item.progress ?? 0, isNext, status === 'done');
              return (
                <LessonRow
                  chipLabel={t('screen.level.lessonChip', {
                    n: item.lessonorder ?? '·',
                  })}
                  title={item.lessonname}
                  status={status}
                  isNext={isNext}
                  ctaLabel={isNext ? upNextCtaLabel : undefined}
                  steps={steps}
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
