import { Images } from '@/assets_edtech';
import {
  Column,
  DefaultBackgroundImage,
  FilledButton,
  H2,
  H5,
  H6,
  LayoutScrollView,
  ProgressRing,
  Row,
  SizedBox,
} from '@/components';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import LessonResultItem from './Components/LessonResultItem';
import { DashboardCardColors } from '@/constants';
import { useAppSelector } from '@/redux';
import { getProfile } from '@/redux/slices';
import { useFont, useStudentProgress } from '@/services';
import type { GradeProgress } from '@/models';
import { useTranslation } from 'react-i18next';

// Phone ring ~160dp; a little larger beside the grid on wide screens.
const RING_SIZE_NARROW = 160;
const RING_SIZE_WIDE = 175;
const RING_STROKE_WIDTH = 14;

function formatFetchedAt(fetchedAt: number, language: string): string {
  const date = new Date(fetchedAt);
  try {
    const locale = language === 'km' ? 'km-KH' : 'en-GB';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  }
}

export default function StudentDashboardScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const displayFont = useFont('bold', 'display');
  const profile = useAppSelector(getProfile);
  const { progress, loading, error, isStale, refresh } = useStudentProgress();
  const { width } = useWindowDimensions();
  const isNarrow = width < theme.breakpoints.DEFAULT_MIN_WIDTH;

  const firstName = profile?.studentfirstname ?? '';
  const lastName = profile?.studentlastname ?? '';
  // Code-point safe (not charAt) so a surrogate-pair character in a name
  // doesn't get split into a mangled half-character initial.
  const firstInitial = firstName ? Array.from(firstName)[0] : '';
  const lastInitial = lastName ? Array.from(lastName)[0] : '';
  const initials = `${firstInitial}${lastInitial}`;

  const hasData = !!progress;
  const ringProgress =
    hasData && progress.totalLevels > 0
      ? progress.completedLevels / progress.totalLevels
      : 0;

  // No flex:1 here: this card lives inside a ScrollView content container,
  // which has no height to distribute, so a flex:1 (flex-basis 0) child
  // collapses to zero height and its content spills over the header.
  // Let the content size the card.
  const renderPointsCard = () => (
    <View
      style={{
        alignSelf: 'stretch',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 6,
        borderWidth: 3,
        borderColor: theme.colors.divider,
        paddingHorizontal: theme.layouts.large,
        paddingVertical: theme.layouts.xlarge,
      }}>
      <Image
        source={Images.TrophyImage}
        resizeMethod="resize"
        resizeMode="contain"
        style={{ width: 64, height: 64 }}
      />
      <SizedBox.Medium height />
      <H5 fontWeight="semi">{t('screen.dashboard.totalPoints')}</H5>
      <SizedBox.Large height />
      <ProgressRing
        size={isNarrow ? RING_SIZE_NARROW : RING_SIZE_WIDE}
        strokeWidth={RING_STROKE_WIDTH}
        progress={ringProgress}
        color={theme.colors.primary}
        trackColor={theme.colors.primaryLight}>
        <H2 fontWeight="semi" color={theme.colors.customHeaderTitle}>
          {String(progress?.totalPoints ?? 0)}
        </H2>
      </ProgressRing>
      <SizedBox.Large height />
      <H6 fontWeight="semi" color={theme.colors.onSurfaceVariant}>
        {t('screen.dashboard.levelsCompleted', {
          done: progress?.completedLevels ?? 0,
          total: progress?.totalLevels ?? 0,
        })}
      </H6>
    </View>
  );

  const renderGradeCards = () => {
    const grades = progress?.grades ?? [];

    if (grades.length === 0) {
      return (
        <Column justifyContent="center" alignItems="center" paddingTop={theme.layouts.large}>
          <H6 color={theme.colors.onSurfaceVariant}>
            {t('screen.dashboard.emptyGrades')}
          </H6>
        </Column>
      );
    }

    return (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          columnGap: theme.layouts.large,
          rowGap: theme.layouts.large,
        }}>
        {grades.map((grade: GradeProgress, index: number) => (
          <View
            key={grade.gradeId}
            style={{
              width: isNarrow ? '100%' : '48%',
            }}>
            <LessonResultItem
              foregroundColor={
                DashboardCardColors[index % DashboardCardColors.length]
                  .foreground as string
              }
              backgroundColor={
                DashboardCardColors[index % DashboardCardColors.length]
                  .background
              }
              primaryColor={
                DashboardCardColors[index % DashboardCardColors.length]
                  .primary
              }
              image={
                DashboardCardColors[index % DashboardCardColors.length].image
              }
              maxProgress={grade.totalLevels}
              progress={grade.completedLevels}
              name={grade.gradeName}
              score={String(grade.score)}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !hasData) {
      return (
        <Column
          justifyContent="center"
          alignItems="center"
          paddingTop={theme.layouts.large}
          paddingBottom={theme.layouts.large}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </Column>
      );
    }

    if (!hasData && error) {
      return (
        <Column
          justifyContent="center"
          alignItems="center"
          paddingTop={theme.layouts.large}
          paddingBottom={theme.layouts.large}>
          <H6 color={theme.colors.onSurfaceVariant}>
            {t('screen.dashboard.loadError')}
          </H6>
          <SizedBox.Large height />
          <FilledButton
            onPress={refresh}
            style={{ alignSelf: 'center', minWidth: 160 }}>
            {t('screen.dashboard.retry')}
          </FilledButton>
        </Column>
      );
    }

    return (
      <>
        {hasData && isStale && (
          <Row paddingBottom={theme.layouts.small} style={{ flexShrink: 1 }}>
            <H6
              color={theme.colors.onSurfaceVariant}
              style={{ flexShrink: 1 }}>
              {t('screen.dashboard.staleNote', {
                date: formatFetchedAt(progress!.fetchedAt, i18n.language),
              })}
            </H6>
          </Row>
        )}
        <View
          style={{
            flexDirection: isNarrow ? 'column' : 'row',
            paddingTop: theme.layouts.large,
            paddingBottom: theme.layouts.large,
          }}>
          <View
            style={{
              flex: isNarrow ? undefined : 1,
              width: isNarrow ? '100%' : undefined,
            }}>
            {renderPointsCard()}
          </View>
          {isNarrow ? <SizedBox.Large height /> : <SizedBox.Large width />}
          <View style={{ flex: isNarrow ? undefined : 2 }}>
            {renderGradeCards()}
          </View>
        </View>
      </>
    );
  };

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <ScrollView
        style={{ alignSelf: 'stretch', flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          padding: theme.layouts.large,
        }}
        showsVerticalScrollIndicator={false}>
        <Row alignItems="center" borderRadius={theme.layouts.defaultRadius}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.primaryLight,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontFamily: displayFont,
                fontSize: 28,
                color: theme.colors.primary,
              }}>
              {initials}
            </Text>
          </View>
          <SizedBox.Large width />
          <Column justifyContent="center" style={{ flex: 1, minWidth: 0 }}>
            <H6 alignSelf="flex-start" textAlign="left" fontWeight="bold">
              {t('screen.dashboard.greeting')}
            </H6>
            {!!profile?.studentfirstname && (
              <H2 alignSelf="flex-start" textAlign="left" fontWeight="semi">
                {`${profile.studentfirstname}!`}
              </H2>
            )}
          </Column>
        </Row>
        {renderContent()}
      </ScrollView>
    </LayoutScrollView>
  );
}
