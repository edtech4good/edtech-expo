import {
  Column,
  Container,
  DefaultBackgroundImage,
  Divider,
  Expanded,
  H4,
  H5,
  LayoutScrollView,
  Row,
  SizedBox,
  StudentProfileCard,
} from '@/components';
import { useAuth } from '@/services';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

export default function StudentProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const { profile } = useAuth();

  useEffect(() => {
    navigation.setOptions({ title: t('screen.profile.header') });
  }, []);

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
