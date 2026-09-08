import { Slot } from 'expo-router';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import * as ScreenOrientation from 'expo-screen-orientation';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import km from '@/locales/km.json';
import { AppThemeProvider, DefaultBackgroundImage } from '@/components';

import { persistor, store } from '@/redux';
import { Api, ApiContext, getDeviceClass } from '@/services';
import { useFonts } from 'expo-font';
import { StartScreen } from '@/screens';

export default function App() {
  const apiInstance = useMemo(() => new Api(), []);

  const [fontsLoaded, fontError] = useFonts({
    PoppinsRegular: require('assets/fonts/Poppins-Regular.ttf'),
    PoppinsBold: require('assets/fonts/Poppins-Bold.ttf'),
    PoppinsSemiBold: require('assets/fonts/Poppins-SemiBold.ttf'),
    NotoSansKhmerRegular: require('assets/fonts/NotoSansKhmer-Regular.ttf'),
    NotoSansKhmerBold: require('assets/fonts/NotoSansKhmer-Bold.ttf'),
    NotoSansKhmerSemiBold: require('assets/fonts/NotoSansKhmer-SemiBold.ttf'),
    SpaceGroteskRegular: require('assets/fonts/SpaceGrotesk-Regular.ttf'),
    SpaceGroteskSemiBold: require('assets/fonts/SpaceGrotesk-SemiBold.ttf'),
    SpaceGroteskBold: require('assets/fonts/SpaceGrotesk-Bold.ttf'),
    PlusJakartaSansRegular: require('assets/fonts/PlusJakartaSans-Regular.ttf'),
    PlusJakartaSansSemiBold: require('assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    PlusJakartaSansBold: require('assets/fonts/PlusJakartaSans-Bold.ttf'),
    SpaceMonoRegular: require('assets/fonts/SpaceMono-Regular.ttf'),
    SpaceMonoBold: require('assets/fonts/SpaceMono-Bold.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    console.log('%cFont Loaded', 'color:green;');
  }, [fontsLoaded]);

  // Per-device orientation policy (ROADMAP Track B): phones locked portrait,
  // tablets locked landscape. Runs once on mount, independent of the
  // isLoading gate below, so a phone doesn't show a landscape splash while
  // fonts/i18n are loading. Lesson-video rotation exception deferred.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const lock =
      getDeviceClass() === 'phone'
        ? ScreenOrientation.OrientationLock.PORTRAIT_UP
        : ScreenOrientation.OrientationLock.LANDSCAPE;
    ScreenOrientation.lockAsync(lock).catch(() => {
      // Some platforms/devices reject the lock; never block boot on it.
    });
  }, []);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    handleInitTranslation();
  }, []);

  const handleInitTranslation = async () => {
    await i18next.use(initReactI18next).init({
      compatibilityJSON: 'v3',
      resources: {
        en: {
          translation: en,
        },
        km: {
          translation: km,
        },
      },
      lng: 'en',
      fallbackLng: 'km',
      interpolation: {
        escapeValue: false,
      },
      react: { useSuspense: false },
    });
    setIsReady(true);
  };

  useEffect(() => {
    moment.updateLocale('en', {
      relativeTime: {
        future: 'in %s',
        past: '%s ago',
        s: 'a few seconds',
        ss: '%d seconds',
        m: 'a minute',
        mm: '%d minutes',
        h: '1 hour', // this is the setting that you need to change
        hh: '%d hours',
        d: 'a day',
        dd: '%d days',
        w: 'a week',
        ww: '%d weeks',
        M: '1 month', // change this for month
        MM: '%d months',
        y: 'a year',
        yy: '%d years',
      },
    });
  }, []);

  // StartScreen needs the theme (useTheme) and i18n contexts, and
  // AppThemeProvider needs the redux store, so the loading gate has to live
  // inside the provider tree rather than as an early return above it.
  // fontError keeps a failed font download from leaving the splash up forever
  // — the app proceeds on fallback fonts instead.
  const isLoading = (!fontsLoaded && !fontError) || !isReady;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <ApiContext.Provider value={apiInstance}>
            <AppThemeProvider>
              {isLoading ? <StartScreen /> : <Slot />}
            </AppThemeProvider>
          </ApiContext.Provider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
