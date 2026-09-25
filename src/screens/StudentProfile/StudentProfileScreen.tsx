import {
  Chip,
  Column,
  Container,
  DefaultBackgroundImage,
  Divider,
  EyebrowText,
  Expanded,
  H4,
  H5,
  LayoutScrollView,
  Row,
  SizedBox,
  StudentProfileCard,
} from '@/components';
import { useAuth, useDesign, useFont } from '@/services';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

// Corporate detail-card row: label (muted eyebrow) + value (body text).
// A standalone component (not inline JSX) so its own useTheme/useFont calls
// stay outside the parent's hook-order constraints — same extracted-component
// pattern as LevelSelectionScreen's LessonRowSpacer.
function ProfileDetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const bodyFont = useFont('normal', 'body');

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
      <EyebrowText color={theme.colors.onSurfaceVariant}>{label}</EyebrowText>
      <Text
        style={{
          fontFamily: bodyFont,
          fontSize: 16,
          color: theme.colors.onSurface,
        }}>
        {value}
      </Text>
    </View>
  );
}

export default function StudentProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const displayFont = useFont('bold', 'display');
  const navigation = useNavigation();

  const { profile } = useAuth();

  useEffect(() => {
    navigation.setOptions({ title: t('screen.profile.header') });
  }, []);

  if (isCorporate) {
    const firstName = profile?.studentfirstname ?? '';
    const lastName = profile?.studentlastname ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    // Code-point safe (not charAt) so a surrogate-pair character in a name
    // doesn't get split into a mangled half-character initial.
    const firstInitial = firstName ? Array.from(firstName)[0] : '';
    const lastInitial = lastName ? Array.from(lastName)[0] : '';
    const initials = `${firstInitial}${lastInitial}`;

    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <Container
          backgroundColor="transparent"
          alignItems="stretch"
          paddingLeft={theme.layouts.pageHorizontalPadding}
          paddingRight={theme.layouts.pageHorizontalPadding}
          paddingTop={theme.layouts.pageVerticalPadding}
          paddingBottom={theme.layouts.pageVerticalPadding}>
          <EyebrowText>{t('screen.profile.header')}</EyebrowText>
          <SizedBox.Medium height />
          <Text
            style={{
              fontFamily: displayFont,
              fontSize: 28,
              color: theme.colors.onBackground,
            }}>
            {fullName}
          </Text>
          <SizedBox.Large height />
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.primaryLight,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontFamily: displayFont,
                fontSize: 32,
                color: theme.colors.primary,
              }}>
              {initials}
            </Text>
          </View>
          <SizedBox.Large height />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Chip label={profile?.schoolusername ?? ''} />
            <EyebrowText>
              {`${t('screen.profile.memberSinceLabel')} · ${
                profile?.dateofjoin ?? ''
              }`}
            </EyebrowText>
          </View>
          <SizedBox.Large height />
          <View
            style={{
              borderRadius: theme.radii.card,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              backgroundColor: theme.colors.surface,
              padding: 16,
            }}>
            <EyebrowText size={10}>
              {t('screen.profile.personalDetailTitle')}
            </EyebrowText>
            <SizedBox.Medium height />
            <ProfileDetailRow
              label={t('screen.profile.firstNameLabel')}
              value={profile?.studentfirstname ?? ''}
            />
            <SizedBox.Small height />
            <ProfileDetailRow
              label={t('screen.profile.lastNameLabel')}
              value={profile?.studentlastname ?? ''}
            />
            <SizedBox.Small height />
            <ProfileDetailRow
              label={t('screen.profile.dateOfBirthLabel')}
              value={profile?.dateofjoin ?? ''}
            />
            <SizedBox.Large height />
            <EyebrowText size={10}>
              {t('screen.profile.contactDetailTitle')}
            </EyebrowText>
            <SizedBox.Medium height />
            <ProfileDetailRow
              label={t('screen.profile.mobileNumberLabel')}
              value={profile?.contact || t('screen.profile.n/a')}
            />
          </View>
        </Container>
      </LayoutScrollView>
    );
  }

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <Container
        backgroundColor="transparent"
        paddingLeft={theme.fontSizes.h5}
        paddingBottom={theme.fontSizes.h5}
        paddingRight={theme.fontSizes.h5}
        paddingTop={theme.fontSizes.h5}>
        <Row>
          <StudentProfileCard />
          <SizedBox width={theme.fontSizes.h5} />
          <Expanded
            paddingLeft={theme.layouts.large}
            paddingRight={theme.layouts.large}>
            <H4 fontWeight="semi" alignSelf="flex-start">
              {t('screen.profile.personalDetailTitle')}
            </H4>
            <Divider height={theme.layouts.large} />
            <Row>
              <Expanded>
                <H5
                  alignSelf="flex-start"
                  textAlign="left"
                  color={theme.colors.onSurfaceVariant}>
                  {t('screen.profile.firstNameLabel')}
                </H5>
                <SizedBox.Large height />
                <H5
                  alignSelf="flex-start"
                  textAlign="left"
                  color={theme.colors.onSurfaceVariant}>
                  {t('screen.profile.lastNameLabel')}
                </H5>
                <SizedBox.Large height />
                <H5
                  alignSelf="flex-start"
                  textAlign="left"
                  color={theme.colors.onSurfaceVariant}>
                  {t('screen.profile.dateOfBirthLabel')}
                </H5>
              </Expanded>
              <Expanded flex={2}>
                <H5
                  fontWeight="bold"
                  alignSelf="flex-start"
                  color={theme.colors.onSurfaceVariant}>
                  {profile?.studentfirstname}
                </H5>
                <SizedBox.Large height />
                <H5
                  fontWeight="bold"
                  alignSelf="flex-start"
                  color={theme.colors.onSurfaceVariant}>
                  {profile?.studentlastname}
                </H5>
                <SizedBox.Large height />
                <H5
                  fontWeight="bold"
                  alignSelf="flex-start"
                  color={theme.colors.onSurfaceVariant}>
                  {profile?.dateofjoin}
                </H5>
              </Expanded>
            </Row>
            <SizedBox.Large height />
            <H4 fontWeight="semi" alignSelf="flex-start">
              {t('screen.profile.contactDetailTitle')}
            </H4>
            <Divider height={theme.layouts.large} />
            <Row>
              <Expanded>
                <H5
                  alignSelf="flex-start"
                  textAlign="left"
                  color={theme.colors.onSurfaceVariant}>
                  {t('screen.profile.mobileNumberLabel')}
                </H5>
              </Expanded>
              <Expanded flex={2}>
                <H5
                  fontWeight="semi"
                  alignSelf="flex-start"
                  color={theme.colors.onSurfaceVariant}>
                  {profile?.contact || t('screen.profile.n/a')}
                </H5>
              </Expanded>
            </Row>
          </Expanded>
        </Row>
      </Container>
    </LayoutScrollView>
  );
}
