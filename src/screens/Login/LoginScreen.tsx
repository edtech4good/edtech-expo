import { Images } from '@/assets';
import {
  AppButton,
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
import { isOnlineOnly } from '@/utils';
import { useLocalSearchParams } from 'expo-router';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

// Corporate branch's language-switch face for "ភាសាខ្មែរ" — the corporate
// Latin faces (Space Grotesk/Plus Jakarta) have no Khmer glyphs, same
// reasoning as the language chips this control replaces.
const KHMER_LABEL_FONT_FAMILY = 'NotoSansKhmerSemiBold';

// Handoff §1/v2.1: 44pt segmented English/ភាសាខ្មែរ switch, top-right,
// active segment white on `#F4F6F9`. Replaces the old two-chip row.
// role="radiogroup"/"radio" per the assignment's accessibility ask.
function LoginLanguageSwitch({
  selectedLanguage,
  onChangeLanguage,
}: {
  selectedLanguage: string;
  onChangeLanguage: (lng: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const bodyFontFamily = useFont('semi', 'body');

  const segments: Array<{
    code: 'en' | 'km';
    label: string;
    fontFamily?: string;
    testID: string;
  }> = [
    { code: 'en', label: t('screen.login.englishOption'), testID: 'login-lang-en' },
    {
      code: 'km',
      label: t('screen.login.khmerOption'),
      fontFamily: KHMER_LABEL_FONT_FAMILY,
      testID: 'login-lang-km',
    },
  ];

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('screen.login.languageSwitchLabel')}
      style={{
        flexDirection: 'row',
        padding: 3,
        gap: 2,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surfaceVariant,
        minHeight: 44,
        alignItems: 'center',
      }}>
      {segments.map(segment => {
        const active = selectedLanguage === segment.code;
        return (
          <Pressable
            key={segment.code}
            testID={segment.testID}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, selected: active }}
            accessibilityLabel={segment.label}
            hitSlop={{ top: 3, bottom: 3 }}
            onPress={() => onChangeLanguage(segment.code)}
            style={{
              minHeight: 38,
              paddingHorizontal: 16,
              borderRadius: theme.radii.pill,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: active ? theme.colors.surface : 'transparent',
              ...(active
                ? {
                    shadowColor: theme.colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 1,
                    shadowRadius: 3,
                    elevation: 2,
                  }
                : null),
            }}>
            <Text
              style={{
                fontFamily: segment.fontFamily ?? bodyFontFamily,
                // Khmer glyphs read small at the English 13px used for this
                // control — v2.1 spec calls for 14px on the Khmer segment
                // label specifically; English stays 13px.
                fontSize: segment.code === 'km' ? 14 : 13,
                color: active
                  ? theme.colors.onSurface
                  : theme.colors.onSurfaceVariant,
              }}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
  const {
    login,
    isLogginIn,
    error,
    resetError,
    errorStatus,
    errorCode,
    errorMessage,
  } = useAuth();
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
    // Online mode (MIV/DCRS phone app) has no local content directory and
    // must never trigger Android's Storage Access Framework folder picker —
    // that flow exists only for the offline/Raspberry-Pi kiosk mode.
    if (isOnlineOnly() || !_.isEmpty(grantedDirectory)) return;
    handleStorageDirectory();
  }, []);

  useEffect(() => {
    if (!isLoggedOut || !modalRef.current) return;
    modalRef.current.show(t('screen.login.sessionExpiredMessage'));
  }, [isLoggedOut]);

  // A 400 is "wrong credentials" only when it's actually rpi-api's
  // "User/Password not matching" failure, not any 400. The open
  // error-contract PR (#75) adds a `code` to the body ('LOGIN_FAILED');
  // until it lands, rpi-api sends no `code` and the message text lives in
  // `errormessage` (see Api.ts's responseTransform), so both shapes are
  // checked here. Any other 400 falls through to the modal below, same as
  // every non-400 failure.
  const isWrongCredentialsError =
    errorStatus === 400 &&
    (errorCode === 'LOGIN_FAILED' ||
      (!errorCode && /User\/Password not matching/.test(errorMessage ?? '')));

  useEffect(() => {
    if (error === '' || !modalRef.current) return;
    // Corporate wrong-credentials is shown as the field-level error state
    // per the v2.1 handoff (see the effect below) instead of the modal.
    // Every other failure — network/unreachable, 5xx, 429, and non-credential
    // 400s — keeps the existing modal here, for both themes.
    if (isCorporate && isWrongCredentialsError) return;
    // 429 rarely carries a usable body message, and apisauce/axios's own
    // fallback text ("Request failed with status code 429") isn't fit for
    // this modal — show the localized friendly copy instead, for both
    // themes (kids kept the raw message here before this fix).
    const modalMessage =
      errorStatus === 429 ? t('screen.login.tooManyAttemptsError') : error;
    modalRef.current.show(modalMessage);
  }, [error, errorStatus, isWrongCredentialsError, isCorporate, t]);

  // Corporate-only: rpi-api's wrong-credentials failure becomes the
  // handoff's combined field error state instead of the modal above — both
  // fields get the 2px error border, but the message renders once, under
  // password (AppTextField's `showErrorBorder` border-only field lets
  // username carry the border with no message of its own). react-hook-form
  // clears these the same way it clears any other field error: the next
  // submit re-validates `required`, and since both fields still hold text,
  // that revalidation clears them before `handleLogin` re-runs.
  //
  // The i18n KEY is stored here, not a translated string — storing the
  // translated text would freeze it at whatever language was active when
  // the error first fired, same bug as the modal re-showing on language
  // change. The key is re-translated (and re-pushed into react-hook-form)
  // by the effect below, which does depend on `t`.
  const [wrongCredentialsErrorKey, setWrongCredentialsErrorKey] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (!isCorporate || error === '' || !isWrongCredentialsError) {
      setWrongCredentialsErrorKey(undefined);
      return;
    }
    setWrongCredentialsErrorKey('screen.login.invalidCredentialsError');
  }, [error, isWrongCredentialsError, isCorporate]);

  // Once the learner edits either field, the wrong-credentials state is
  // over: drop the key so a later language switch (which changes `t` and
  // re-runs the effect below) can't push the error back onto a field
  // they've already corrected. Both fields' server errors go together —
  // it's one combined error, and leaving the password half behind with
  // no key would freeze its message in the current language. Only
  // `type === 'change'` counts (a user keystroke through useController's
  // onChange); setValue/reset don't carry it, and setError emits no
  // `values`, so RHF 7.88's watch(callback) never fires for it.
  useEffect(() => {
    if (!wrongCredentialsErrorKey) return;
    const subscription = methods.watch((_values, { type }) => {
      if (type !== 'change') return;
      (['username', 'password'] as const).forEach((name) => {
        if (methods.getFieldState(name).error?.type === 'server') {
          methods.clearErrors(name);
        }
      });
      setWrongCredentialsErrorKey(undefined);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrongCredentialsErrorKey]);

  // Which key was last pushed into react-hook-form, so a `t`-only re-run
  // (language switch) can be told apart from a fresh failure.
  const appliedWrongCredentialsKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!wrongCredentialsErrorKey) {
      appliedWrongCredentialsKeyRef.current = undefined;
      return;
    }
    const isFreshFailure =
      appliedWrongCredentialsKeyRef.current !== wrongCredentialsErrorKey;
    // A language switch only re-translates an error that is still on the
    // field. If it's gone — cleared by an edit or by the next submit's
    // revalidation while that request is in flight — leave it gone.
    if (
      !isFreshFailure &&
      methods.getFieldState('password').error?.type !== 'server'
    ) {
      return;
    }
    appliedWrongCredentialsKeyRef.current = wrongCredentialsErrorKey;
    methods.setError('username', { type: 'server', message: '' });
    methods.setError('password', {
      type: 'server',
      message: t(wrongCredentialsErrorKey),
    });
    // methods is stable enough for this purpose; re-running per keystroke
    // would fight the revalidation-clears-it flow described above. `t` IS
    // a dependency on purpose, so the message re-translates on language
    // switch instead of staying frozen in whatever language was active
    // when the error first fired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrongCredentialsErrorKey, t]);

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
    // Clear the error state the modal-visibility effect above reads —
    // otherwise a later language switch changes `t`'s identity, re-runs
    // that effect while `error` is still non-empty, and the modal that was
    // just dismissed pops back up (reported against both kids and
    // corporate themes).
    resetError();
    if (!modalRef.current) return;
    modalRef.current.hide();
  };

  if (isCorporate) {
    // Corporate layout per the v2.1 handoff (§1 Login): white page, 28px
    // horizontal padding, top-right language segmented switch, a
    // vertically-centered left-aligned stack (logo → "Welcome back" →
    // subcopy → labelled username/password → primary pill), and a footer
    // pinned to the bottom. "Use company SSO" and "Forgot password?" are
    // omitted — no backend for either (Bucket C in
    // docs/corporate-design-per-school.md; also dropped from v2.1's own
    // login spec). The logo slot shows the EdTech lockup — brandingconfig
    // (useBrandingRefresh) only resolves post-login from profile.schoolname,
    // so there's nothing to key a per-school swap off of on this screen yet.
    // v2.1 type scale differs by language: Khmer's taller glyphs/diacritics
    // need more line-height than the Latin numbers below give them. English
    // visuals (Space Grotesk 30, 14/22 subtitle) are unchanged.
    const isKhmer = selectedLanguage === 'km';

    return (
      <LayoutScrollView
        backgroundColor={theme.colors.background}
        useScroll
        footer={
          <Row
            justifyContent="center"
            paddingBottom={20}
            paddingLeft={28}
            paddingRight={28}>
            <EyebrowText size={9} style={{ textAlign: 'center' }}>
              {t('screen.login.poweredByFooter')}
            </EyebrowText>
          </Row>
        }>
        <FormProvider {...methods}>
          <View style={{ flex: 1, width: '100%', paddingHorizontal: 28 }}>
            <Row justifyContent="flex-end" paddingTop={8}>
              <LoginLanguageSwitch
                selectedLanguage={selectedLanguage}
                onChangeLanguage={handleChangeLanguage}
              />
            </Row>
            <Expanded justifyContent="center" alignItems="flex-start">
              <View
                style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
                <Image
                  source={Images.BrandLogo}
                  resizeMethod="resize"
                  resizeMode="contain"
                  style={{ alignSelf: 'flex-start', width: 160, height: 40 }}
                />
                <SizedBox.Large height />
                <Text
                  style={{
                    fontFamily: displayFont,
                    fontSize: isKhmer ? 26 : 30,
                    lineHeight: isKhmer ? 44 : 34.5,
                    color: theme.colors.onBackground,
                    textAlign: 'left',
                  }}>
                  {t('screen.login.welcomeTitle')}
                </Text>
                <SizedBox.Small height />
                <Text
                  style={{
                    fontFamily: bodyFont,
                    fontSize: 14,
                    lineHeight: isKhmer ? 26 : 22,
                    color: theme.colors.onSurfaceVariant,
                    textAlign: 'left',
                  }}>
                  {t('screen.login.welcomeSubtitle')}
                </Text>
                <SizedBox.Large height />
                <FormAppTextField
                  name="username"
                  label={t('screen.login.usernameLabel')}
                  rules={{
                    required: {
                      value: true,
                      message: t('screen.login.usernameRequiredError'),
                    },
                  }}
                  autoCapitalize="none"
                  textContentType="username"
                  autoComplete="username"
                  testID="login-username"
                  errorTestID="login-error-username"
                />
                <SizedBox.Medium height />
                <FormAppTextField
                  name="password"
                  label={t('screen.login.passwordLabel')}
                  secureTextEntry
                  rules={{
                    required: {
                      value: true,
                      message: t('screen.login.passwordRequiredError'),
                    },
                  }}
                  textContentType="password"
                  autoComplete="password"
                  testID="login-password"
                  errorTestID="login-error-password"
                />
                <SizedBox.Large height />
                <AppButton
                  label={t('screen.login.signInButton')}
                  loading={isLogginIn}
                  fullWidth
                  testID="login-submit"
                  onPress={methods.handleSubmit(handleLogin)}
                />
              </View>
            </Expanded>
          </View>
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
