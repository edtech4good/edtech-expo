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
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';
import { useTheme } from 'styled-components/native';

export default function StartScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
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
