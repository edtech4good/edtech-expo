import type { CertificateItem, CertificatesOverview } from '@/models';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useFont, useTypeRole } from '@/services';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { formatFetchedAt } from '../Components/MyProgressSection';
import MiniCertificate from './MiniCertificate';
import {
  buildCertificatesView,
  isNewCertificate,
  issuedDay,
  itemLines,
  localiseCertificatesOverview,
  sectionVisible,
} from './certificatesLogic';

export interface CertificatesSectionProps {
  overview?: CertificatesOverview;
  seenCertificateIds: string[] | null;
  studentName: string;
  loading: boolean;
  error: boolean;
  /** The learning server has no certificates route (404): the section hides, quietly. */
  unsupported?: boolean;
  isStale: boolean;
  onRetry: () => void;
}

/** "Programme", "Module" or "Grade": the school's own English word when the interface is English. */
export function useScopeLabel() {
  const { t } = useTranslation();
  const language = useAppSelector(getSelectedLanguage);
  return (item: CertificateItem): string => {
    if (language === 'en' && item.tierLabel) return item.tierLabel;
    return item.scope === 'curriculum'
      ? t('certificates.scopeProgramme')
      : item.scope === 'level'
        ? t('certificates.scopeModule')
        : t('certificates.scopeGrade');
  };
}

function Card({
  item,
  studentName,
  isNew,
}: {
  item: CertificateItem;
  studentName: string;
  isNew: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useAppSelector(getSelectedLanguage);
  const scopeLabel = useScopeLabel();
  const body = useTypeRole('body');
  const caption = useTypeRole('caption');
  const semi = useFont('semi', 'body');
  const nameFont = useFont('semi', 'body', item.nameLanguage);

  const issued = item.certificate;
  const scope = scopeLabel(item);
  const day = issued ? issuedDay(issued.issuedAt, language) : '';
  const sub = issued
    ? day
      ? t('certificates.issuedLine', { scope, date: day })
      : t('certificates.issuedNoDate', { scope })
    : t('certificates.notYetLine', { scope });
  const { lines, more } = itemLines(item);
  const lineTexts = lines.map(l => t(`certificates.${l.key}`, l.params));
  if (more > 0) lineTexts.push(t('certificates.andMore', { n: more }));

  const muted = {
    fontFamily: caption.fontFamily,
    fontSize: caption.fontSize,
    lineHeight: caption.lineHeight,
    color: theme.colors.onSurfaceVariant,
  } as const;

  const content = (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: theme.radii.card,
        borderWidth: 1,
        borderColor: issued ? theme.colors.divider : theme.colors.outline,
        borderStyle: issued ? 'solid' : 'dashed',
        backgroundColor: issued ? theme.colors.surface : 'transparent',
      }}>
      {issued && <MiniCertificate name={studentName} code={issued.code} />}
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: nameFont,
            fontSize: body.fontSize,
            lineHeight: body.lineHeight,
            color: theme.colors.onBackground,
          }}>
          {item.name}
        </Text>
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
              {t('certificates.newChip')}
            </Text>
          </View>
        )}
      </View>
      <Text style={muted}>{sub}</Text>
      {lineTexts.map((line, at) => (
        <Text key={at} style={muted}>
          {line}
        </Text>
      ))}
      {issued && (
        // A label only: the whole card is the press target.
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={{
            alignSelf: 'flex-start',
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 20,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.primary,
          }}>
          <Text
            style={{
              fontFamily: semi,
              fontSize: Math.max(14, caption.fontSize),
              color: theme.colors.onPrimary,
            }}>
            {t('certificates.open')}
          </Text>
        </View>
      )}
    </View>
  );

  const a11yLabel = [
    item.name,
    issued ? t('certificates.a11yIssued') : t('certificates.a11yNotYet'),
    sub,
    isNew ? t('certificates.newChip') : null,
    ...lineTexts,
  ]
    .filter(Boolean)
    .join('. ');

  if (!issued) {
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
      accessibilityHint={t('certificates.openHint')}
      testID={`certificate-card-${issued.certificateId}`}
      onPress={() =>
        router.push({
          pathname: '/progress/certificate',
          params: { id: issued.certificateId },
        })
      }>
      {content}
    </Pressable>
  );
}

/**
 * The Certificates section of My progress (corporate), below Awards.
 * Presentational: the screen wires it to useCertificatesOverview. Issued
 * certificates and, for tiers set to Certificate, what is left to earn. Offline
 * this is the last-known list. Hidden when the server has none to show or has no
 * certificates route.
 */
export default function CertificatesSection({
  overview,
  seenCertificateIds,
  studentName,
  loading,
  error,
  unsupported = false,
  isStale,
  onRetry,
}: CertificatesSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useAppSelector(getSelectedLanguage);
  const title = useTypeRole('cardTitle');
  const body = useTypeRole('body');
  const caption = useTypeRole('caption');
  const semi = useFont('semi', 'body');
  const localised = useMemo(
    () => localiseCertificatesOverview(overview, language),
    [overview, language],
  );
  const view = useMemo(() => buildCertificatesView(localised), [localised]);

  if (!sectionVisible(overview, unsupported)) return null;

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
        {t('certificates.loading')}
      </Text>
    );
  } else if (!overview) {
    inner = (
      <View style={{ gap: 8, alignItems: 'flex-start' }}>
        <Text style={muted}>{t('certificates.loadError')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('certificates.retry')}
          onPress={onRetry}
          style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text
            style={{
              fontFamily: semi,
              fontSize: body.fontSize,
              color: theme.colors.primary,
            }}>
            {t('certificates.retry')}
          </Text>
        </Pressable>
      </View>
    );
  } else {
    inner = (
      <View style={{ gap: 20 }}>
        {view.groups.map(group => (
          <View key={group.curriculumId} style={{ gap: 8 }}>
            {group.showHeading && (
              <Text accessibilityRole="header" style={{ ...muted, color: theme.colors.onBackground }}>
                {group.name}
              </Text>
            )}
            {group.items.map(item => (
              <Card
                key={`${item.scope}-${item.scopeId}`}
                item={item}
                studentName={studentName}
                isNew={
                  !!item.certificate &&
                  isNewCertificate(
                    seenCertificateIds,
                    item.certificate.certificateId,
                  )
                }
              />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ marginTop: 32, gap: 12 }} testID="certificates-section">
      <View>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: title.fontFamily,
            fontSize: title.fontSize,
            lineHeight: title.lineHeight,
            color: theme.colors.onBackground,
          }}>
          {t('certificates.title')}
        </Text>
        {overview && (
          <Text style={muted}>
            {view.earnedCount === 0
              ? t('certificates.noneEarned')
              : t('certificates.countLine', { n: view.earnedCount })}
          </Text>
        )}
        {isStale && overview && (
          <Text style={muted}>
            {t('certificates.staleNote', {
              date: formatFetchedAt(overview.fetchedAt, language),
            })}
          </Text>
        )}
      </View>
      {inner}
    </View>
  );
}
