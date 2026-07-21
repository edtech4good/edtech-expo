import { Images } from '@/assets';
import {
  DebugDisplay,
  DefaultBackgroundImage,
  Expanded,
  FilledButton,
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
import { getGrantedStorageDirectory, SettingActions } from '@/redux/slices';
import { useAuth, useSetting } from '@/services';
import { useLocalSearchParams } from 'expo-router';
import _ from 'lodash';
import { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';
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
