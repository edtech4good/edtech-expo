import { useAppDispatch, useAppSelector } from '@/redux';
import {
  AwardsActions,
  getProfile,
  getSelectedLanguage,
  getStudentAwards,
} from '@/redux/slices';
import { useAwardsOverview, useFont, useTypeRole } from '@/services';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AwardBadge, { useBadgeColor } from './AwardBadge';
import {
  awardColorIndex,
  earnedDateWording,
  findAward,
  localiseAwardsOverview,
} from './awardsLogic';

function Fact({
  label,
  value,
  valueLanguage,
}: {
  label: string;
  value: string;
  /** Language of `value` when it is content text (programme name). */
  valueLanguage?: string;
}) {
  const theme = useTheme();
  const caption = useTypeRole('caption');
  const body = useTypeRole('body');
  const semi = useFont('semi', 'body', valueLanguage);
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        minHeight: 48,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
      }}>
      <Text
        style={{
          fontFamily: caption.fontFamily,
          fontSize: caption.fontSize,
          lineHeight: caption.lineHeight,
          color: theme.colors.onSurfaceVariant,
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: semi,
          fontSize: body.fontSize + 1,
          lineHeight: body.lineHeight,
          color: theme.colors.onBackground,
        }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Award detail, pushed from a row in My progress. Opening it marks the award
 * seen (clears its "New" chip). No share, no certificate link. Opened cold (a
 * restart, a deep link) with nothing cached it fetches the overview and shows
 * "Loading" until the award, or "not available", is known. Android's hardware
 * back goes to My progress (BackHandler below), like the header's back button.
 */
export default function AwardDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useAppSelector(getProfile);
  const studentId = profile?.studentid;
  const language = useAppSelector(getSelectedLanguage);
  const { loading, refresh } = useAwardsOverview({ onlyIfMissing: true });
  const rawOverview = useAppSelector(getStudentAwards(studentId))?.overview;
  const overview = useMemo(
    () => localiseAwardsOverview(rawOverview, language),
    [rawOverview, language],
  );
  const award = useMemo(
    () => (id ? findAward(overview, String(id)) : undefined),
    [overview, id],
  );
  const color = useBadgeColor(
    award ? awardColorIndex(overview, award.awardId) : 0,
  );
  const title = useTypeRole('screenTitle', award?.levelNameLanguage);
  const body = useTypeRole('body');
  const caption = useTypeRole('caption');

  // Android hardware back: to My progress, not to the first tab.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.navigate('/progress');
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  // A cached overview that does not hold this award (it was earned after the
  // last fetch): look once more before saying it is not available.
  const refetchedRef = useRef(false);
  useEffect(() => {
    if (id && !award && rawOverview && !refetchedRef.current) {
      refetchedRef.current = true;
      refresh();
    }
  }, [id, award, rawOverview, refresh]);

  useEffect(() => {
    if (studentId && award) {
      dispatch(
        AwardsActions.markAwardsSeen({ studentId, ids: [award.awardId] }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, award?.awardId]);

  if (!award) {
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: theme.colors.background,
        }}>
        <Text
          accessibilityLiveRegion="polite"
          style={{
            fontFamily: body.fontFamily,
            fontSize: body.fontSize,
            lineHeight: body.lineHeight,
            color: theme.colors.onSurface,
          }}>
          {loading ? t('awards.loading') : t('awards.notFound')}
        </Text>
      </View>
    );
  }

  const w = earnedDateWording(award.earnedAt, award.approximate, language);
  const earnedValue =
    w.key === 'earnedNoDate'
      ? t('awards.statusValue')
      : t(award.approximate ? 'awards.detailDateBy' : 'awards.detailDate', {
          date: w.date,
        });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        padding: theme.layouts.pageHorizontalPadding,
        gap: 16,
      }}>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
        <AwardBadge number={award.number} earned color={color} size={96} />
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: title.fontFamily,
            fontSize: title.fontSize,
            lineHeight: title.lineHeight,
            color: theme.colors.onBackground,
            textAlign: 'center',
          }}>
          {t('awards.complete', { name: award.levelName })}
        </Text>
      </View>
      <View>
        <Fact
          label={t('awards.programme')}
          value={award.curriculumName}
          valueLanguage={award.curriculumNameLanguage}
        />
        {award.number > 0 && award.totalInProgramme > 0 && (
          <Fact
            label={t('awards.module')}
            value={t('awards.moduleNumber', {
              n: award.number,
              total: award.totalInProgramme,
            })}
          />
        )}
        <Fact label={t('awards.earnedLabel')} value={earnedValue} />
        <Fact label={t('awards.status')} value={t('awards.statusValue')} />
      </View>
      {award.approximate && (
        <Text
          style={{
            fontFamily: caption.fontFamily,
            fontSize: caption.fontSize,
            lineHeight: caption.lineHeight,
            color: theme.colors.onSurfaceVariant,
          }}>
          {t('awards.approxNote')}
        </Text>
      )}
    </ScrollView>
  );
}
