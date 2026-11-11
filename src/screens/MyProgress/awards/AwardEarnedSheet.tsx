import { AppButton } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  AwardsActions,
  getProfile,
  getSelectedLanguage,
  getStudentAwards,
} from '@/redux/slices';
import { useFont, useTypeRole } from '@/services';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AwardBadge, { useBadgeColor } from './AwardBadge';
import { findAward, localiseAwardsOverview } from './awardsLogic';

/**
 * "Award earned" bottom sheet over the corporate result screen. It shows when
 * the awards slice holds a queued award (queued only by a refetch after a
 * result the server accepted, see awardsLogic.decideSeen). Closing it, by
 * either button, marks that award seen. Offline results queue nothing, so
 * nothing shows. One award at a time; a second one follows when the first is
 * closed.
 */
export default function AwardEarnedSheet() {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const studentId = useAppSelector(getProfile)?.studentid;
  const entry = useAppSelector(getStudentAwards(studentId));
  const language = useAppSelector(getSelectedLanguage);
  const overview = useMemo(
    () => localiseAwardsOverview(entry?.overview, language),
    [entry?.overview, language],
  );
  const awardId = entry?.sheetAwardIds?.[0];
  const award = useMemo(
    () => (awardId ? findAward(overview, awardId) : undefined),
    [overview, awardId],
  );
  const groupIndex = Math.max(
    0,
    (overview?.curricula ?? []).findIndex(
      c => c.name === award?.curriculumName,
    ),
  );
  const color = useBadgeColor(groupIndex);
  const display = useTypeRole('cardTitle');
  const body = useTypeRole('body');
  const caption = useTypeRole('caption');
  const eyebrow = useFont('semi', 'body');

  if (!studentId || !awardId) return null;
  // A queued id the overview no longer knows: drop it quietly.
  if (!award) {
    dispatch(AwardsActions.markAwardsSeen({ studentId, ids: [awardId] }));
    return null;
  }

  const close = () =>
    dispatch(AwardsActions.markAwardsSeen({ studentId, ids: [awardId] }));
  const viewAwards = () => {
    close();
    router.navigate('/progress');
  };
  const percent = award.progress === null ? null : Math.floor(award.progress);

  return (
    <Modal transparent animationType="slide" visible onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('awards.sheetContinue')}
          onPress={close}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(9,16,29,0.45)',
          }}
        />
        <View
          accessibilityViewIsModal
          style={{
            alignSelf: 'center',
            width: '100%',
            maxWidth: 480,
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radii.dialog,
            borderTopRightRadius: theme.radii.dialog,
            padding: 24,
            paddingBottom: 32,
            alignItems: 'center',
            gap: 8,
          }}>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: eyebrow,
              fontSize: Math.max(12, caption.fontSize),
              color: theme.colors.successText,
            }}>
            {t('awards.sheetTitle')}
          </Text>
          <AwardBadge number={award.number} earned color={color} size={88} />
          <Text
            style={{
              fontFamily: display.fontFamily,
              fontSize: display.fontSize,
              lineHeight: display.lineHeight,
              color: theme.colors.onBackground,
              textAlign: 'center',
            }}>
            {t('awards.complete', { name: award.levelName })}
          </Text>
          <Text
            style={{
              fontFamily: body.fontFamily,
              fontSize: body.fontSize,
              lineHeight: body.lineHeight,
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
            }}>
            {award.curriculumName}
          </Text>
          {percent !== null && (
            <Text
              style={{
                fontFamily: body.fontFamily,
                fontSize: body.fontSize,
                lineHeight: body.lineHeight,
                color: theme.colors.onSurface,
                textAlign: 'center',
              }}>
              {t('awards.sheetPoints', { percent })}
            </Text>
          )}
          <View style={{ height: 8 }} />
          <View style={{ width: '100%', gap: 8 }}>
            <AppButton
              label={t('awards.viewAwards')}
              onPress={viewAwards}
              fullWidth
            />
            <AppButton
              variant="secondary"
              label={t('awards.sheetContinue')}
              onPress={close}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
