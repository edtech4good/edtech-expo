import { useAppSelector } from '@/redux';
import { getAccessToken, getSelectedLanguage } from '@/redux/slices';
import { StartScreen } from '@/screens';
import { useApi } from '@/services';
import { Stack } from 'expo-router';
import i18next from 'i18next';
import { useEffect, useState } from 'react';

export default function InitialStack() {
  const api = useApi();
  const accessToken = useAppSelector(getAccessToken);
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    i18next.changeLanguage(selectedLanguage);
    handleCheckAuth();
  }, []);

  const handleCheckAuth = async () => {
    if (accessToken)
      await api.setHeaders({ authorization: `Bearer ${accessToken}` });
    setIsReady(true);
  };

  if (isReady === false) return <StartScreen />;
  // if (isReady && !accessToken)
  //   return <Redirect href="/login?isLoggedOut=true" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(home)" />
      <Stack.Screen name="(teacher)" />
    </Stack>
  );
}
