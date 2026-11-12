import { AppButton } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  AwardSheetActions,
  AwardsActions,
  getAwardSheet,
  getProfile,
  getSelectedLanguage,
  getStudentAwards,
  liveAwardSheetIds,
} from '@/redux/slices';
import { useDesign, useFont, useTypeRole } from '@/services';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AwardBadge, { useBadgeColor } from './AwardBadge';
import {
  awardColorIndex,
  displayPercent,
  findAward,
  localiseAwardsOverview,
} from './awardsLogic';

/**
 * "Award earned" bottom sheet, mounted ONCE at the corporate home layout
 * (app/(app)/(home)/_layout.tsx) so it shows over whichever screen the learner
 * is on, quiz result or practice result alike. It shows the first award in the
 * in-memory queue (AwardSheetSlice), which only a result the server accepted
 * can fill (services/awardsFlow). Closing it, by either button, marks the
 * award seen. Offline results queue nothing, so nothing shows. One award at a
 * time; the next follows when the first is closed. Entries expire and are
 * dropped rather than shown late; the queue is cleared on logout and when the
 * learner changes.
 */
export default function AwardEarnedSheet() {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isCorporate } = useDesign();
  const studentId = useAppSelector(getProfile)?.studentid;
  const entry = useAppSelector(getStudentAwards(studentId));
  const sheet = useAppSelector(getAwardSheet);
  const language = useAppSelector(getSelectedLanguage);
  const overview = useMemo(
    () => localiseAwardsOverview(entry?.overview, language),
    [entry?.overview, language],
  );
  const awardId = isCorporate
    ? liveAwardSheetIds(sheet, studentId, Date.now())[0]
    : undefined;
  const award = useMemo(
    () => (awardId ? findAward(overview, awardId) : undefined),
    [overview, awardId],
  );
  const color = useBadgeColor(awardId ? awardColorIndex(overview, awardId) : 0);
  const display = useTypeRole('cardTitle', award?.levelNameLanguage);
  const body = useTypeRole('body');
  const curriculumBody = useTypeRole('body', award?.curriculumNameLanguage);
  const caption = useTypeRole('caption');
  const eyebrow = useFont('semi', 'body');

  // Housekeeping, never during render: a queue that belongs to another
  // learner, expired entries, and an id the overview no longer knows.
  useEffect(() => {
    if (!sheet) return;
    if (sheet.studentId !== null && sheet.studentId !== (studentId ?? null)) {
      dispatch(AwardSheetActions.clearAwardSheet());
      return;
    }
    if (sheet.queue.some(q => q.expiresAt <= Date.now())) {
      dispatch(AwardSheetActions.dropExpiredAwardSheet({ now: Date.now() }));
    }
  }, [sheet, studentId, dispatch]);
  useEffect(() => {
    if (studentId && awardId && !award) {
      dispatch(AwardsActions.markAwardsSeen({ studentId, ids: [awardId] }));
    }
  }, [studentId, awardId, award, dispatch]);

  if (!studentId || !awardId || !award) return null;

  const close = () =>
    dispatch(AwardsActions.markAwardsSeen({ studentId, ids: [awardId] }));
  const viewAwards = () => {
    close();
    router.navigate('/progress');
  };
  const percent =
    award.progress === null ? null : displayPercent(award.progress);

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
              fontFamily: curriculumBody.fontFamily,
              fontSize: curriculumBody.fontSize,
              lineHeight: curriculumBody.lineHeight,
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
