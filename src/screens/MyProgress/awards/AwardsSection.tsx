import { ProgressBar } from '@/components/ui';
import type { AwardsOverview } from '@/models';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useFont, useTypeRole } from '@/services';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { formatFetchedAt } from '../Components/MyProgressSection';
import AwardBadge, { useBadgeColor } from './AwardBadge';
import {
  AWARD_THRESHOLD_PERCENT,
  AwardGroup,
  AwardListItem,
  buildAwardsView,
  earnedDateWording,
  isNewAward,
  localiseAwardsOverview,
} from './awardsLogic';

export interface AwardsSectionProps {
  overview?: AwardsOverview;
  seenAwardIds: string[] | null;
  loading: boolean;
  error: boolean;
  isStale: boolean;
  onRetry: () => void;
}

function useEarnedText() {
  const { t } = useTranslation();
  const language = useAppSelector(getSelectedLanguage);
  return (earnedAt: string | null, approximate: boolean) => {
    const w = earnedDateWording(earnedAt, approximate, language);
    return t(`awards.${w.key}`, { date: w.date });
  };
}

function ProgressTrack({ percent, label }: { percent: number; label: string }) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ marginTop: 6, justifyContent: 'center' }}>
      <ProgressBar progress={clamped / 100} height={6} testID={label} />
      {/* The 80% line: the point where the award is earned. */}
      <View
        style={{
          position: 'absolute',
          left: `${AWARD_THRESHOLD_PERCENT}%`,
          width: 2,
          height: 12,
          marginLeft: -1,
          backgroundColor: theme.colors.onBackground,
        }}
      />
    </View>
  );
}

function AwardRow({
  item,
  group,
  isNew,
}: {
  item: AwardListItem;
  group: AwardGroup;
  isNew: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const body = useTypeRole('body');
  const caption = useTypeRole('caption');
  const semi = useFont('semi', 'body');
  const earnedText = useEarnedText();
  const color = useBadgeColor(group.index);

  const earned = item.kind === 'earned';
  let sub: string;
  if (item.kind === 'earned') {
    sub = earnedText(item.earnedAt, item.approximate);
  } else {
    const percent = Math.floor(item.progress);
    sub =
      percent > 0
        ? t('awards.progressToEarn', {
            percent,
            threshold: AWARD_THRESHOLD_PERCENT,
          })
        : t('awards.notStarted', { threshold: AWARD_THRESHOLD_PERCENT });
  }
  const name = item.levelName;
  const a11yLabel = [
    name,
    earned ? t('awards.a11yEarned') : t('awards.a11yNotEarned'),
    sub,
    isNew ? t('awards.newChip') : null,
  ]
    .filter(Boolean)
    .join('. ');

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: theme.radii.card,
        borderWidth: 1,
        borderColor: earned ? theme.colors.divider : theme.colors.outline,
        borderStyle: earned ? 'solid' : 'dashed',
        backgroundColor: earned ? theme.colors.surface : 'transparent',
      }}>
      <AwardBadge number={item.number} earned={earned} color={color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: semi,
            fontSize: body.fontSize,
            lineHeight: body.lineHeight,
            color: theme.colors.onBackground,
          }}>
          {name}
        </Text>
        <Text
          style={{
            fontFamily: caption.fontFamily,
            fontSize: caption.fontSize,
            lineHeight: caption.lineHeight,
            color: theme.colors.onSurfaceVariant,
          }}>
          {sub}
        </Text>
        {item.kind === 'unearned' && (
          <ProgressTrack
            percent={item.progress}
            label={`award-progress-${item.levelId}`}
          />
        )}
      </View>
      {isNew && (
        <View
          style={{
            minHeight: 24,
            paddingHorizontal: 10,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.primaryLight,
            justifyContent: 'center',
          }}>
          <Text
            style={{
              fontFamily: semi,
              fontSize: Math.max(12, caption.fontSize),
              color: theme.colors.primaryDark,
            }}>
            {t('awards.newChip')}
          </Text>
        </View>
      )}
    </View>
  );

  if (!earned) {
    return (
      <View accessible accessibilityLabel={a11yLabel}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t('awards.openHint')}
      testID={`award-row-${item.awardId}`}
      onPress={() =>
        router.push({
          pathname: '/progress/award',
          params: { id: item.awardId },
        })
      }>
      {content}
    </Pressable>
  );
}

function GroupBlock({
  group,
  seenAwardIds,
}: {
  group: AwardGroup;
  seenAwardIds: string[] | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const display = useTypeRole('cardTitle');
  const caption = useTypeRole('caption');
  return (
    <View style={{ gap: 8 }}>
      <View>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: display.fontFamily,
            fontSize: display.fontSize - 2,
            lineHeight: display.lineHeight,
            color: theme.colors.onBackground,
          }}>
          {group.name}
        </Text>
        <Text
          style={{
            fontFamily: caption.fontFamily,
            fontSize: caption.fontSize,
            lineHeight: caption.lineHeight,
            color: theme.colors.onSurfaceVariant,
          }}>
          {t('awards.groupCount', {
            done: group.earnedCount,
            total: group.totalCount,
          })}
        </Text>
      </View>
      {group.items.map(item => (
        <AwardRow
          key={item.kind === 'earned' ? item.awardId : `u-${item.levelId}`}
          item={item}
          group={group}
          isNew={
            item.kind === 'earned' && isNewAward(seenAwardIds, item.awardId)
          }
        />
      ))}
    </View>
  );
}

/**
 * The Awards section of My progress (corporate). Presentational: the screen
 * wires it to useAwardsOverview. Awards are never shown as earned until the
 * learning server has said so, so offline this is the last-known list.
 */
export default function AwardsSection({
  overview,
  seenAwardIds,
  loading,
  error,
  isStale,
  onRetry,
}: AwardsSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useAppSelector(getSelectedLanguage);
  const title = useTypeRole('cardTitle');
  const body = useTypeRole('body');
  const caption = useTypeRole('caption');
  const semi = useFont('semi', 'body');
  const view = useMemo(
    () => buildAwardsView(localiseAwardsOverview(overview, language)),
    [overview, language],
  );

  const countLine =
    view.earnedTotal === 0
      ? t('awards.noneEarned')
      : t('awards.countLine', {
          earned: view.earnedTotal,
          toEarn: view.toEarnTotal,
        });

  const muted = {
    fontFamily: caption.fontFamily,
    fontSize: caption.fontSize,
    lineHeight: caption.lineHeight,
    color: theme.colors.onSurfaceVariant,
  } as const;

  let inner;
  if (!overview && loading) {
    inner = (
      <Text accessibilityLiveRegion="polite" style={muted}>
        {t('awards.loading')}
      </Text>
    );
  } else if (!overview) {
    inner = (
      <View style={{ gap: 8, alignItems: 'flex-start' }}>
        <Text style={muted}>{t('awards.loadError')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('awards.retry')}
          onPress={onRetry}
          style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontFamily: semi, fontSize: body.fontSize, color: theme.colors.primary }}>
            {t('awards.retry')}
          </Text>
        </Pressable>
      </View>
    );
  } else {
    inner = (
      <View style={{ gap: 20 }}>
        {view.earnedTotal === 0 && (
          <View
            style={{
              padding: 16,
              borderRadius: theme.radii.card,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              backgroundColor: theme.colors.surfaceVariant,
              gap: 4,
            }}>
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: semi,
                fontSize: body.fontSize + 2,
                lineHeight: body.lineHeight + 2,
                color: theme.colors.onBackground,
              }}>
              {t('awards.emptyTitle')}
            </Text>
            <Text
              style={{
                fontFamily: body.fontFamily,
                fontSize: body.fontSize,
                lineHeight: body.lineHeight,
                color: theme.colors.onSurface,
              }}>
              {t('awards.emptyBody', { threshold: AWARD_THRESHOLD_PERCENT })}
            </Text>
          </View>
        )}
        {view.groups.map(group => (
          <GroupBlock
            key={`${group.curriculumId ?? group.name}-${group.index}`}
            group={group}
            seenAwardIds={seenAwardIds}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={{ marginTop: 32, gap: 12 }} testID="awards-section">
      <View>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: title.fontFamily,
            fontSize: title.fontSize,
            lineHeight: title.lineHeight,
            color: theme.colors.onBackground,
          }}>
          {t('awards.title')}
        </Text>
        {overview && <Text style={muted}>{countLine}</Text>}
        {isStale && overview && (
          <Text style={muted}>
            {t('awards.staleNote', {
              date: formatFetchedAt(overview.fetchedAt, language),
            })}
          </Text>
        )}
      </View>
      {inner}
    </View>
  );
}
