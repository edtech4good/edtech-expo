import { useAppDispatch, useAppSelector } from '@/redux';
import {
  AwardsActions,
  getProfile,
  getSelectedLanguage,
  getStudentAwards,
} from '@/redux/slices';
import { useFont, useTypeRole } from '@/services';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AwardBadge, { useBadgeColor } from './AwardBadge';
import { earnedDateWording, findAward, localiseAwardsOverview } from './awardsLogic';

function Fact({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const caption = useTypeRole('caption');
  const body = useTypeRole('body');
  const semi = useFont('semi', 'body');
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
 * seen (clears its "New" chip). No share, no certificate link.
 */
export default function AwardDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useAppSelector(getProfile);
  const studentId = profile?.studentid;
  const language = useAppSelector(getSelectedLanguage);
  const rawOverview = useAppSelector(getStudentAwards(studentId))?.overview;
  const overview = useMemo(
    () => localiseAwardsOverview(rawOverview, language),
    [rawOverview, language],
  );
  const award = useMemo(
    () => (id ? findAward(overview, String(id)) : undefined),
    [overview, id],
  );
  const groupIndex = Math.max(
    0,
    (overview?.curricula ?? []).findIndex(c => c.name === award?.curriculumName),
  );
  const color = useBadgeColor(groupIndex);
  const title = useTypeRole('screenTitle');
  const body = useTypeRole('body');
  const caption = useTypeRole('caption');

  useEffect(() => {
    if (studentId && award) {
      dispatch(AwardsActions.markAwardsSeen({ studentId, ids: [award.awardId] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, award?.awardId]);

  if (!award) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
        <Text
          style={{
            fontFamily: body.fontFamily,
            fontSize: body.fontSize,
            lineHeight: body.lineHeight,
            color: theme.colors.onSurface,
          }}>
          {t('awards.notFound')}
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
        <Fact label={t('awards.programme')} value={award.curriculumName} />
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
