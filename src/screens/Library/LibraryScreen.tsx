import {
  CurriculumCard,
  DefaultBackgroundImage,
  EyebrowText,
  LayoutScrollView,
  normalizeProgressFraction,
  ProgressCard,
  SizedBox,
} from '@/components';
import { useEffect } from 'react';
import { useTheme } from 'styled-components/native';
import { UnitCardColors } from '@/constants';
import { ActivityIndicator, View, Text } from 'react-native';
import { useBreakpoint, useDesign, useFont, useLibrary } from '@/services';
import { router, useNavigation } from 'expo-router';
import { useAppDispatch } from '@/redux';
import { SelectionActions } from '@/redux/slices';
import {
  Course,
  LibraryCurriculum,
  LibraryGrade,
  LibraryLevel,
  Subject,
  Unit,
} from '@/models';
import { useTranslation } from 'react-i18next';

const GRID_GAP = 20;

// Builds a drill-down-compatible Subject selection from a library curriculum
// so the persisted selection path (selectedSubject → selectedCourse →
// selectedUnit, same as the Subjects → Courses → Units → Levels drill-down)
// stays consistent regardless of whether the learner reached a level via
// that drill-down or via Library. Fields the library payload doesn't carry
// (isdeleted, curriculumstatus, subjectid) get harmless defaults — nothing
// downstream reads them for a selection made this way.
function toSubjectSelection(curriculum: LibraryCurriculum): Subject {
  return {
    curriculumdescription: curriculum.curriculumdescription ?? '',
    curriculumid: curriculum.curriculumid,
    curriculumname: curriculum.curriculumname,
    curriculumstatus: true,
    isdeleted: false,
    progress: curriculum.progress,
    subjectid: curriculum.curriculumid,
  };
}

// Builds a drill-down-compatible Course selection from a library grade so
// useLevelHeader (see LevelSelectionScreen) treats it as a valid selection
// and skips its fallback level/all + level/grade + grade/all resolution.
// Fields the library payload doesn't carry (gradedescription, gradestatus,
// points, etc.) get harmless defaults — nothing downstream reads them for
// a selection made this way.
function toCourseSelection(
  curriculum: LibraryCurriculum,
  grade: LibraryGrade,
): Course {
  return {
    curriculumid: curriculum.curriculumid,
    gradedescription: '',
    gradeid: grade.gradeid,
    gradename: grade.gradename,
    gradeorder: grade.gradeorder,
    gradestatus: true,
    isdeleted: false,
    number_levels: grade.levels.length,
    passing_points: 0,
    points: 0,
    progress: grade.progress,
    progress_points: 0,
  };
}

// Same idea as toCourseSelection, but for the Unit shape selectUnit/
// getSelectedUnit expect (Unit here is really "level" — see src/models/Unit.ts).
function toUnitSelection(grade: LibraryGrade, level: LibraryLevel): Unit {
  return {
    gradeid: grade.gradeid,
    isdeleted: false,
    leveldescription: level.leveldescription ?? '',
    levelid: level.levelid,
    levelname: level.levelname,
    levelorder: level.levelorder,
    levelstatus: true,
    passing_points: 0,
    points: 0,
    progress: level.progress,
    quiz_points: 0,
  };
}

export default function LibraryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const displayFont = useFont('bold', 'display');
  const curriculumNameFont = useFont('semi', 'display');
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { curricula, isLoading, isEmpty, isUnavailable, hasEntry } =
    useLibrary();

  const columns =
    useBreakpoint({ mobile: 1, phablet: 2, tablet: 3, desktop: 3 }) ?? 3;

  useEffect(() => {
    navigation.setOptions({ title: t('screen.library.header') });
  }, []);

  const handleLevelPress = async (
    curriculum: LibraryCurriculum,
    grade: LibraryGrade,
    level: LibraryLevel,
  ) => {
    dispatch(SelectionActions.selectSubject(toSubjectSelection(curriculum)));
    dispatch(SelectionActions.selectCourse(toCourseSelection(curriculum, grade)));
    dispatch(SelectionActions.selectUnit(toUnitSelection(grade, level)));
    // Known gap: this pushes 'levels' onto the Home tab's own nested Stack
    // (home/_layout.tsx), whatever it currently holds. If the learner had
    // already drilled into Subjects → Courses → Units before visiting
    // Library, the Home tab is left showing this Level Detail screen on top
    // of that history instead of Units — switching to Home shows the level
    // just opened from Library rather than where the learner left off.
    // expo-router 3.4 (this app's version) has no supported way to reset a
    // sibling navigator's state from outside it: dismissAll() only
    // dismisses modal-presented screens within the *current* navigator, not
    // a different tab's nested Stack, and there's no exposed resetRoot.
    // Leaving this documented rather than reaching for an unsupported/flaky
    // workaround; revisit if/when expo-router is upgraded.
    router.navigate({
      pathname: '/home/levels',
      // `from: 'library'` lets LevelSelectionScreen point its back button
      // here instead of the level/unit drill-down's default fallback (see
      // that screen's `from`-aware headerLeft effect) — Library isn't part
      // of that stack, so the default canGoBack history doesn't reach it.
      params: { levelid: level.levelid, from: 'library' },
    });
  };

  const levelCard = (
    curriculum: LibraryCurriculum,
    grade: LibraryGrade,
    level: LibraryLevel,
  ) => {
    const progressPercent = Math.round(
      (normalizeProgressFraction(level.progress) ?? 0) * 100,
    );
    const lessonsProgress = t('screen.library.lessonsProgress', {
      done: level.number_completed_lessons,
      total: level.number_lessons,
    });
    return (
      <View
        key={level.levelid}
        style={{
          width: `${100 / columns}%`,
          paddingHorizontal: GRID_GAP / 2,
          marginBottom: GRID_GAP,
        }}>
        <CurriculumCard
          testID={`library-level-${level.levelid}`}
          title={level.levelname}
          meta={level.leveldescription ?? undefined}
          progress={normalizeProgressFraction(level.progress)}
          footer={lessonsProgress}
          metaNumberOfLines={2}
          onPress={() => handleLevelPress(curriculum, grade, level)}
          accessibilityLabel={`${level.levelname}, ${progressPercent}%, ${lessonsProgress}`}
        />
      </View>
    );
  };

  if (isCorporate) {
    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <View
          testID="library-screen"
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 1024,
            paddingHorizontal:
              theme.layouts.pageHorizontalPadding - GRID_GAP / 2,
            paddingVertical: theme.layouts.pageVerticalPadding,
          }}>
          <View
            style={{
              paddingHorizontal: GRID_GAP / 2,
              marginBottom: theme.layouts.large,
            }}>
            <Text
              style={{
                fontFamily: displayFont,
                fontSize: 24,
                color: theme.colors.onBackground,
              }}>
              {t('screen.library.header')}
            </Text>
            {/* No existing time-formatter util in this app (checked
                src/utils, src/services) to turn `lastUpdated`
                (generatedAt, an ISO string) into a localized "Updated
                <time>" caption — per the task's own guidance, skipping
                that caption rather than rendering a raw ISO string. */}
          </View>

          {isLoading && !hasEntry && !isUnavailable ? (
            <View
              testID="library-loading"
              style={{
                paddingHorizontal: GRID_GAP / 2,
                paddingVertical: theme.layouts.xlarge,
                alignItems: 'center',
              }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : isUnavailable ? (
            <View
              testID="library-unavailable"
              style={{ paddingHorizontal: GRID_GAP / 2 }}>
              <EyebrowText size={12} color={theme.colors.onSurfaceVariant}>
                {t('screen.library.unavailable')}
              </EyebrowText>
            </View>
          ) : isEmpty ? (
            <View
              testID="library-empty"
              style={{ paddingHorizontal: GRID_GAP / 2 }}>
              <EyebrowText size={12} color={theme.colors.onSurfaceVariant}>
                {t('screen.library.empty')}
              </EyebrowText>
            </View>
          ) : (
            curricula.map(curriculum => (
              <View
                key={curriculum.curriculumid}
                testID={`library-curriculum-${curriculum.curriculumid}`}
                style={{ marginBottom: theme.layouts.large }}>
                <View
                  style={{
                    paddingHorizontal: GRID_GAP / 2,
                    marginBottom: theme.layouts.medium,
                  }}>
                  <Text
                    accessibilityRole="header"
                    style={{
                      fontFamily: curriculumNameFont,
                      fontSize: theme.fontSizes.subtitle,
                      color: theme.colors.primary,
                    }}>
                    {curriculum.curriculumname}
                  </Text>
                </View>
                {curriculum.grades.map(grade => (
                  <View
                    key={grade.gradeid}
                    testID={`library-grade-${grade.gradeid}`}
                    style={{ marginBottom: theme.layouts.medium }}>
                    <View
                      style={{
                        paddingHorizontal: GRID_GAP / 2,
                        marginBottom: theme.layouts.small,
                      }}>
                      <Text
                        accessibilityRole="header"
                        style={{
                          fontFamily: displayFont,
                          fontSize: theme.fontSizes.h5,
                          color: theme.colors.onBackground,
                        }}>
                        {grade.gradename}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                      }}>
                      {grade.levels.map(level =>
                        levelCard(curriculum, grade, level),
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </LayoutScrollView>
    );
  }

  // Kids theme has no nav entry point to this screen (Library is a
  // corporate-only tab/rail item — see NavItems.ts), but the route still
  // exists, so render the same data with the kids ProgressCard styling
  // rather than leaving it blank if it's ever reached directly.
  const flatLevels: { curriculum: LibraryCurriculum; grade: LibraryGrade; level: LibraryLevel }[] =
    curricula.flatMap(curriculum =>
      curriculum.grades.flatMap(grade =>
        grade.levels.map(level => ({ curriculum, grade, level })),
      ),
    );

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <View testID="library-screen" style={{ flex: 1, width: '100%' }}>
        {isLoading && !hasEntry && !isUnavailable ? (
          <View
            testID="library-loading"
            style={{ padding: theme.layouts.large, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : isUnavailable ? (
          <View
            testID="library-unavailable"
            style={{ padding: theme.layouts.large }}>
            <EyebrowText size={12}>
              {t('screen.library.unavailable')}
            </EyebrowText>
          </View>
        ) : isEmpty ? (
          <View testID="library-empty" style={{ padding: theme.layouts.large }}>
            <EyebrowText size={12}>{t('screen.library.empty')}</EyebrowText>
          </View>
        ) : (
          <>
            <SizedBox.Large height />
            {flatLevels.map(({ curriculum, grade, level }, index) => (
              <ProgressCard
                key={level.levelid}
                themeIndex={index % UnitCardColors.length}
                title={level.levelname}
                description={level.leveldescription ?? ''}
                progress={level.progress}
                onPress={() => handleLevelPress(curriculum, grade, level)}
              />
            ))}
          </>
        )}
      </View>
    </LayoutScrollView>
  );
}
