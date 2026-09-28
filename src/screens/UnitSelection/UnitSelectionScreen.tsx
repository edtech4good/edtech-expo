import {
  CorporateCardGrid,
  DefaultBackgroundImage,
  LayoutScrollView,
  ProgressCard,
  SizedBox,
} from '@/components';
import { useEffect } from 'react';
import { useTheme } from 'styled-components/native';
import { UnitCardColors } from '@/constants';
import { FlatList, useWindowDimensions } from 'react-native';
import { KeyExtractorHelper, getRemoteResourceUrl } from '@/utils';
import { useBreakpoint, useDesign, useProgressSummary } from '@/services';
import {
  Redirect,
  router,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useUnit } from '@/services';
import { useAppSelector } from '@/redux';
import { getSelectedCourse } from '@/redux/slices';
import { Unit, findLevelProgress } from '@/models';
import { useTranslation } from 'react-i18next';

// Corporate level cards. Each card's % pill and bar come from the same
// progress summary as My progress / Home (lessons completed / all lessons in
// the level), matched by levelid. No summary row (not loaded yet, or the API
// build predates the grades breakdown) means no pill and no bar; the
// server's points-based `unit.progress` is no longer shown. Its own
// component so the summary fetch only runs on the corporate branch.
function CorporateUnitGrid({
  units,
  onPress,
}: {
  units: Unit[];
  onPress: (unit: Unit) => void;
}) {
  const { summary } = useProgressSummary();
  const curricula = summary?.curricula ?? [];

  return (
    <CorporateCardGrid
      items={units.map(unit => {
        const remoteUrl = getRemoteResourceUrl(`level-${unit.levelid}.jpg`);
        const level = findLevelProgress(curricula, unit.levelid);
        return {
          key: unit.levelid,
          title: unit.levelname,
          meta: unit.leveldescription,
          progress: level === undefined ? undefined : level.percent / 100,
          imageSource: remoteUrl ? { uri: remoteUrl } : undefined,
          onPress: () => onPress(unit),
        };
      })}
    />
  );
}

export default function UnitSelectionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ gradeid?: string }>();
  const selectedCourse = useAppSelector(getSelectedCourse);
  // The URL param survives a browser reload on web; the redux selection covers
  // native, where navigate() is not always given params by older code paths.
  const gradeId =
    (typeof params.gradeid === 'string' && params.gradeid) ||
    selectedCourse?.gradeid ||
    '';
  const { fetch, units, selectUnit, clear } = useUnit(gradeId);

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
    navigation.setOptions({ title: t('screen.unit.header') });
  }, []);

  useEffect(() => {
    if (!gradeId) return;
    fetch();
    return () => {
      clear();
    };
  }, [gradeId]);

  const handleItemPress = async (unit: Unit) => {
    await selectUnit(unit);
    router.navigate({
      pathname: '/home/levels',
      params: { levelid: unit.levelid },
    });
  };

  if (!gradeId) return <Redirect href="/home/subjects" />;

  if (isCorporate) {
    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <CorporateUnitGrid units={units} onPress={handleItemPress} />
      </LayoutScrollView>
    );
  }

  const renderItemSeparator = () => <SizedBox.Large height />;

  const renderItem = ({ item, index }: { item: Unit; index: number }) => {
    const imageIndex = index % UnitCardColors.length;
    return (
      <ProgressCard
        themeIndex={imageIndex}
        title={item.levelname}
        description={item.leveldescription}
        progress={item.progress}
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
        numColumns={numOfColumn}
        data={units}
        ListHeaderComponent={renderItemSeparator}
        renderItem={renderItem}
        keyExtractor={KeyExtractorHelper}
        showsVerticalScrollIndicator={false}
      />
    </LayoutScrollView>
  );
}
