import { Images } from '@/assets';
import {
  Column,
  Container,
  DefaultBackgroundImage,
  Expanded,
  H2,
  LayoutScrollView,
  SizedBox,
} from '@/components';
import { useDesign } from '@/services';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, View } from 'react-native';
import { useTheme } from 'styled-components/native';

export default function StartScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isCorporate } = useDesign();

  if (isCorporate) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Image
          source={Images.BrandLogo}
          resizeMethod="resize"
          resizeMode="contain"
          style={{
            maxWidth: 240,
            minWidth: 160,
            marginBottom: 24,
          }}
        />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <Expanded justifyContent="space-around">
        <Column>
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
          <SizedBox.Large height />
          <SizedBox.Large height />
          <H2 fontWeight="semi" color={theme.colors.primary}>
            {t('screen.login.welcomeMessage')}
          </H2>
        </Column>
        <Image
          source={Images.CharacterGroup}
          resizeMethod="resize"
          resizeMode="contain"
          style={{
            maxWidth: 512,
            minWidth: 256,
            height: 310,
          }}
        />
        {/* <Icons.AnimalGroup /> */}
      </Expanded>
    </LayoutScrollView>
  );
}
