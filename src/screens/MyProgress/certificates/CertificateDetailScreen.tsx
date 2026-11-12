import { AppButton } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  CertificatesActions,
  getProfile,
  getSelectedLanguage,
  getStudentCertificates,
} from '@/redux/slices';
import {
  useCertificatesOverview,
  useConnectivity,
  useFont,
  useTypeRole,
} from '@/services';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Linking,
  Platform,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';

import { useScopeLabel } from './CertificatesSection';
import MiniCertificate from './MiniCertificate';
import {
  certificateActions,
  findCertificate,
  issuedDay,
  itemTitle,
  localiseCertificatesOverview,
  shareContent,
  shareOnWeb,
} from './certificatesLogic';

function Fact({
  label,
  value,
  valueLanguage,
  mono = false,
}: {
  label: string;
  value: string;
  /** Language of `value` when it is content text (a programme or module name). */
  valueLanguage?: string;
  mono?: boolean;
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
          letterSpacing: mono ? 1 : undefined,
        }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Certificate detail, pushed from a card in My progress. Opening it marks the
 * certificate seen (clears its "New" chip). Viewable offline from the cached
 * overview; Save PDF and Share link need the internet and the organisation's
 * public link, and say so when they cannot work. Opened cold with nothing
 * cached it fetches the overview first. Android's hardware back goes to My
 * progress, like the header's back button.
 */
export default function CertificateDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useAppSelector(getProfile);
  const studentId = profile?.studentid;
  const studentName = `${profile?.studentfirstname ?? ''} ${
    profile?.studentlastname ?? ''
  }`.trim();
  const language = useAppSelector(getSelectedLanguage);
  const { loading, refresh } = useCertificatesOverview({ onlyIfMissing: true });
  const rawOverview = useAppSelector(getStudentCertificates(studentId))
    ?.overview;
  const overview = useMemo(
    () => localiseCertificatesOverview(rawOverview, language),
    [rawOverview, language],
  );
  const found = useMemo(
    () => (id ? findCertificate(overview, String(id)) : undefined),
    [overview, id],
  );
  const scopeLabel = useScopeLabel();
  const { isOffline } = useConnectivity();
  const [shareFailed, setShareFailed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const title = useTypeRole('screenTitle', found?.item.nameLanguage);
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

  // A cached overview that does not hold this certificate (issued after the
  // last fetch): look once more before saying it is not available.
  const refetchedRef = useRef(false);
  useEffect(() => {
    if (id && !found && rawOverview && !refetchedRef.current) {
      refetchedRef.current = true;
      refresh();
    }
  }, [id, found, rawOverview, refresh]);

  const certificateId = found?.item.certificate?.certificateId;
  useEffect(() => {
    if (studentId && certificateId) {
      dispatch(
        CertificatesActions.markCertificatesSeen({
          studentId,
          ids: [certificateId],
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, certificateId]);

  const certificate = found?.item.certificate;
  if (!found || !certificate) {
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
          {loading ? t('certificates.loading') : t('certificates.notFound')}
        </Text>
      </View>
    );
  }

  const { item, curriculum } = found;
  const actions = certificateActions({
    isOffline,
    checkUrl: certificate.checkUrl,
  });
  const issued = issuedDay(certificate.issuedAt, language);

  const savePdf = () => {
    if (actions.pdfUrl) Linking.openURL(actions.pdfUrl).catch(() => {});
  };
  const shareLink = async () => {
    if (!actions.shareUrl) return;
    setShareFailed(false);
    setLinkCopied(false);
    if (Platform.OS === 'web') {
      const outcome = await shareOnWeb(
        typeof navigator !== 'undefined' ? navigator : undefined,
        actions.shareUrl,
      );
      if (outcome === 'copied') setLinkCopied(true);
      if (outcome === 'failed') setShareFailed(true);
      return;
    }
    try {
      await Share.share(shareContent(Platform.OS, actions.shareUrl));
    } catch {
      setShareFailed(true);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        padding: theme.layouts.pageHorizontalPadding,
        gap: 16,
      }}>
      <MiniCertificate
        name={studentName}
        code={certificate.code}
        large
      />
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: title.fontFamily,
          fontSize: title.fontSize,
          lineHeight: title.lineHeight,
          color: theme.colors.onBackground,
          textAlign: 'center',
        }}>
        {itemTitle(item, scopeLabel(item), curriculum.name)}
      </Text>
      <View>
        {studentName !== '' && (
          <Fact label={t('certificates.labelName')} value={studentName} />
        )}
        <Fact
          label={t('certificates.labelProgramme')}
          value={curriculum.name}
          valueLanguage={curriculum.nameLanguage}
        />
        {item.scope !== 'curriculum' && item.name !== '' && (
          <Fact
            label={scopeLabel(item)}
            value={item.name}
            valueLanguage={item.nameLanguage}
          />
        )}
        {certificate.className && (
          <Fact
            label={t('certificates.labelClass')}
            value={certificate.className}
          />
        )}
        {issued !== '' && (
          <Fact label={t('certificates.labelIssued')} value={issued} />
        )}
        <Fact label={t('certificates.labelCode')} value={certificate.code} mono />
      </View>
      <View style={{ gap: 12 }}>
        <AppButton
          variant="primary"
          size="lg"
          fullWidth
          label={t('certificates.savePdf')}
          disabled={!actions.enabled}
          onPress={savePdf}
          testID="certificate-save-pdf"
        />
        <AppButton
          variant="secondary"
          size="lg"
          fullWidth
          label={t('certificates.shareLink')}
          disabled={!actions.enabled}
          onPress={shareLink}
          testID="certificate-share-link"
        />
        {actions.note && (
          <Text
            accessibilityLiveRegion="polite"
            testID="certificate-actions-note"
            style={{
              fontFamily: caption.fontFamily,
              fontSize: caption.fontSize,
              lineHeight: caption.lineHeight,
              color: theme.colors.onSurfaceVariant,
            }}>
            {t(
              actions.note === 'offline'
                ? 'certificates.noteOffline'
                : 'certificates.noteNoLink',
            )}
          </Text>
        )}
        {linkCopied && (
          <Text
            accessibilityLiveRegion="polite"
            testID="certificate-link-copied"
            style={{
              fontFamily: caption.fontFamily,
              fontSize: caption.fontSize,
              lineHeight: caption.lineHeight,
              color: theme.colors.onSurfaceVariant,
            }}>
            {t('certificates.linkCopied')}
          </Text>
        )}
        {shareFailed && (
          <Text
            style={{
              fontFamily: caption.fontFamily,
              fontSize: caption.fontSize,
              lineHeight: caption.lineHeight,
              color: theme.colors.onSurfaceVariant,
            }}>
            {t('certificates.shareFailed')}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
