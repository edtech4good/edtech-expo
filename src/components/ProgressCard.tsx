import { useBreakpoint } from '@/services';
import { Image, useWindowDimensions, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import BaseButton from './buttons/BaseButton';
import { useMemo } from 'react';
import { ProgressCardColors } from '@/constants';
import SizedBox from './layouts/SizedBox';
import Expanded from './layouts/Expanded';
import H6 from './texts/H6';
import SH3 from './texts/SH3';
import { useTranslation } from 'react-i18next';

interface Props {
  themeIndex: number;
  title: string;
  description: string;
  progress: number;
  onPress?: () => void;
  numberOfColumn?: { tablet: number; phablet: number; mobile: number };
}

const MAX_CARD_WIDTH_SIZE = 395;
const MAX_CARD_HEIGHT_SIZE = 176;

export default function ProgressCard({
  title,
  description,
  progress,
  themeIndex,
  numberOfColumn = { mobile: 2, phablet: 2, tablet: 3 },
  onPress = () => undefined,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { mobile, phablet, tablet } = numberOfColumn;
  const cardWidth = useBreakpoint({
    desktop: MAX_CARD_WIDTH_SIZE,
    tablet: Math.min(
      (width - theme.layouts.large * (tablet + 1)) / tablet,
      MAX_CARD_WIDTH_SIZE,
    ),
    phablet: Math.min(
      (width - theme.layouts.large * (phablet + 1)) / phablet,
      MAX_CARD_WIDTH_SIZE,
    ),
    mobile: width - theme.layouts.large * mobile,
  });

  const { background, image, primary, foreground } = useMemo(
    () => ProgressCardColors[themeIndex],
    [themeIndex],
  );

  return (
    <BaseButton
      onPress={onPress}
      backgroundColor={background}
      borderRadius={16}
      style={{
        flexDirection: 'row',
        width: cardWidth,
        height: MAX_CARD_HEIGHT_SIZE,
        overflow: 'hidden',
        marginLeft: theme.layouts.large,
        marginBottom: theme.layouts.large,
        paddingLeft: theme.layouts.large,
      }}>
      <Image
        source={image}
        resizeMethod="resize"
        resizeMode="contain"
        style={{ width: 145, height: 145 }}
      />
      <SizedBox.Small width />
      <Expanded
        justifyContent="center"
        paddingLeft={theme.layouts.large}
        paddingRight={theme.layouts.large}>
        <H6
          color={theme.colors.onSurface}
          fontWeight="bold"
          alignSelf="flex-start"
          textAlign="left">
          {title}
        </H6>
        <SH3
          color={theme.colors.onSurfaceVariant}
          alignSelf="flex-start"
          textAlign="left"
          numberOfLines={2}>
          {description}
        </SH3>
        <SizedBox.Large height />
        <SH3 color={primary} alignSelf="flex-start">{`${t(
          'screen.level.progressLabel',
        )} ${progress}%`}</SH3>
        <View
          style={{
            height: 5,
            width: '100%',
            backgroundColor: theme.colors.surface,
          }}>
          <View
            style={{
              height: 5,
              width: `${progress}%`,
              backgroundColor: primary,
            }}
          />
        </View>
      </Expanded>
    </BaseButton>
  );
}
