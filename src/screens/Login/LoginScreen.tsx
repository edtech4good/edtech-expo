import { Images } from '@/assets';
import {
  AppButton,
  Chip,
  DebugDisplay,
  DefaultBackgroundImage,
  Expanded,
  EyebrowText,
  FilledButton,
  FormAppTextField,
  FormInput,
  FormPassword,
  GenericModal,
  LayoutScrollView,
  PoweredBy,
  Row,
  SizedBox,
} from '@/components';
import { LoginPayload, ModalHandler } from '@/models';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  getGrantedStorageDirectory,
  getSelectedLanguage,
  SettingActions,
} from '@/redux/slices';
import { useAuth, useDesign, useFont, useSetting } from '@/services';
import { useLocalSearchParams } from 'expo-router';
import _ from 'lodash';
import { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  isTeacher?: boolean;
  devUsername?: string;
  devPassword?: string;
}

export default function LoginScreen({ devPassword, devUsername }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const displayFont = useFont('bold', 'display');
  const bodyFont = useFont('normal', 'body');
  const { login, isLogginIn, error } = useAuth();
  const { isLoggedOut } = useLocalSearchParams();
  const { requestStoragePermission, updateResourcePath } = useSetting();
  const grantedDirectory = useAppSelector(getGrantedStorageDirectory);

  const methods = useForm<LoginPayload>({
    defaultValues: {
      username: __DEV__ ? devUsername : '',
      password: __DEV__ ? devPassword : '',
    },
  });

  const modalRef = useRef<ModalHandler>(null);

  useEffect(() => {
    // console.log('Granted Directory: ', grantedDirectory);
    if (!_.isEmpty(grantedDirectory)) return;
    handleStorageDirectory();
  }, []);

  useEffect(() => {
    if (!isLoggedOut || !modalRef.current) return;
    modalRef.current.show(t('screen.login.sessionExpiredMessage'));
  }, [isLoggedOut]);

  useEffect(() => {
    if (error === '' || !modalRef.current) return;
    modalRef.current.show(error);
  }, [error]);

  const handleStorageDirectory = async () => {
    await requestStoragePermission();
    await updateResourcePath();
  };

  const handleLogin = async (data: LoginPayload) => {
    login(data);
  };

  const handleChangeLanguage = (lng: string) => {
    // i18next.changeLanguage(lng);
    dispatch(SettingActions.changeLanguageAction(lng));
  };

  const handleCloseModal = () => {
    // setAlertModal('');
    if (!modalRef.current) return;
    modalRef.current.hide();
  };

  if (isCorporate) {
    // Corporate layout per the handoff (§1 Login), tablet/web-first: cream
    // page, logo slot, welcome heading, fields, primary pill. "Use company
    // SSO" and "Forgot password?" are omitted — no backend for either
    // (Bucket C in docs/corporate-design-per-school.md). The logo slot shows
    // the EdTech lockup until Phase 4 wires per-school branding.
    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <FormProvider {...methods}>
          <Expanded justifyContent="center" alignItems="center">
            <View
              style={{
                width: '100%',
                maxWidth: 480,
                paddingHorizontal: theme.layouts.pageHorizontalPadding,
              }}>
              <Image
                source={Images.BrandLogo}
                resizeMethod="resize"
                resizeMode="contain"
                style={{ alignSelf: 'center', width: 280, height: 72 }}
              />
              <SizedBox.Large height />
              <Text
                style={{
                  fontFamily: displayFont,
                  fontSize: 30,
                  color: theme.colors.onBackground,
                  textAlign: 'center',
                }}>
                {t('screen.login.welcomeTitle')}
              </Text>
              <SizedBox.Small height />
              <Text
                style={{
                  fontFamily: bodyFont,
                  fontSize: 14,
                  lineHeight: 22,
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                }}>
                {t('screen.login.welcomeSubtitle')}
              </Text>
              <SizedBox.Large height />
              <FormAppTextField
                name="username"
                placeholder={t('screen.login.emailPlaceholder')}
                rules={{ required: true }}
              />
              <SizedBox.Medium height />
              <FormAppTextField
                name="password"
                placeholder={t('screen.login.passwordPlaceholder')}
                secureTextEntry
                rules={{ required: true }}
              />
              <SizedBox.Large height />
              <AppButton
                label={t('screen.login.loginButton')}
                loading={isLogginIn}
                fullWidth
                onPress={methods.handleSubmit(handleLogin)}
              />
              <SizedBox.Large height />
              <Row justifyContent="center">
                <Chip
                  label="English"
                  active={selectedLanguage === 'en'}
                  onPress={() => handleChangeLanguage('en')}
                />
                <SizedBox.Medium width />
                <Chip
                  label="ភាសាខ្មែរ"
                  fontFamily="NotoSansKhmerSemiBold"
                  active={selectedLanguage === 'km'}
                  onPress={() => handleChangeLanguage('km')}
                />
              </Row>
              <SizedBox.Large height />
              <EyebrowText size={9} style={{ textAlign: 'center' }}>
                POWERED BY EDTECH FOR GOOD
              </EyebrowText>
            </View>
          </Expanded>
        </FormProvider>
        <GenericModal ref={modalRef} onConfirm={handleCloseModal} />
        {__DEV__ && <DebugDisplay />}
      </LayoutScrollView>
    );
  }

  return (
    <LayoutScrollView
      flexDirection="column-reverse"
      backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <FormProvider {...methods}>
        <Expanded flexDirection="row">
          <Expanded
            flexDirection="row"
            justifyContent="flex-end"
            alignItems="flex-end"
            paddingRight={theme.layouts.defaultComponentSize}
            paddingBottom={theme.layouts.defaultComponentSize}>
            <Image
              resizeMethod="resize"
              resizeMode="contain"
              source={Images.DefaultCharacter}
            />
          </Expanded>
          <Expanded
            justifyContent="center"
            alignItems="center"
            style={{ maxWidth: 480, minWidth: 256 }}>
            <Image
              source={Images.BrandLogo}
              resizeMethod="resize"
              resizeMode="contain"
              style={{
                maxWidth: 480,
                minWidth: 256,
              }}
            />
            <SizedBox.Large height />
            <FormInput
              name="username"
              placeholder="Email"
              rules={{ required: true }}
            />
            <SizedBox.Large height />
            <FormPassword
              name="password"
              placeholder="Password"
              rules={{ required: true }}
            />
            <SizedBox.Large height />
            <FilledButton
              isLoading={isLogginIn}
              onPress={methods.handleSubmit(handleLogin)}
              borderColor={theme.colors.surface}
              borderWidth={3}
              style={{
                elevation: 7,
                shadowColor: theme.colors.shadow,
                shadowOffset: {
                  width: 0,
                  height: 0,
                },
                shadowOpacity: 0.25,
                shadowRadius: 15,
              }}>
              {t('screen.login.loginButton')}
            </FilledButton>
            <SizedBox.Large height />
            <Row justifyContent="center">
              <FilledButton
                onPress={() => handleChangeLanguage('en')}
                backgroundColor={theme.colors.secondary}
                borderColor={theme.colors.surface}
                fontFamily="PoppinsSemiBold"
                borderWidth={3}
                style={{
                  minWidth: 120,
                  elevation: 7,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: {
                    width: 0,
                    height: 0,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 15,
                }}>
                English
              </FilledButton>
              <SizedBox.Large width />
              <FilledButton
                onPress={() => handleChangeLanguage('km')}
                backgroundColor={theme.colors.secondary}
                borderColor={theme.colors.surface}
                fontFamily="NotoSansKhmerSemiBold"
                borderWidth={3}
                style={{
                  minWidth: 120,
                  elevation: 7,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: {
                    width: 0,
                    height: 0,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 15,
                }}>
                ភាសាខ្មែរ
              </FilledButton>
            </Row>
          </Expanded>
          <Expanded />
        </Expanded>
      </FormProvider>
      <PoweredBy />
      <GenericModal ref={modalRef} onConfirm={handleCloseModal} />
      {__DEV__ && <DebugDisplay />}
    </LayoutScrollView>
  );
}
