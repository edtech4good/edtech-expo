import { useBreakpoint } from '@/services';
import { Image, useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';
import Column from './layouts/Column';
import { Icons } from '@/assets_edtech';
import Expanded from './layouts/Expanded';
import { DashboardCardColors } from '@/constants';
import { useMemo } from 'react';
import SizedBox from './layouts/SizedBox';
import H4 from './texts/H4';
import H6 from './texts/H6';
import BaseButton from './buttons/BaseButton';

interface Props {
  themeIndex: number;
  title: string;
  description: string;
  onPress?: () => void;
  numberOfColumn?: { tablet: number; phablet: number; mobile: number };
}

const MAX_CARD_WIDTH_SIZE = 227;
const MAX_CARD_HEIGHT_SIZE = 340;

export default function DashboardCard({
  description,
  numberOfColumn = { mobile: 2, phablet: 3, tablet: 5 },
  onPress = () => undefined,
  themeIndex,
  title,
}: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { mobile, phablet, tablet } = numberOfColumn;
  const cardWidth = useBreakpoint({
    desktop: MAX_CARD_WIDTH_SIZE,
    tablet: Math.min(
      (width - theme.layouts.large * (tablet + 1)) / tablet,
      MAX_CARD_WIDTH_SIZE,
    ),
    phablet: (width - theme.layouts.large * (phablet + 1)) / phablet,
    mobile: (width - theme.layouts.large * (mobile + 1)) / mobile,
  });

  const { background, image, primary, foreground } = useMemo(
    () => DashboardCardColors[themeIndex],
    [themeIndex],
  );

  const renderBush = () => {
    return (
      <Column
        borderRadius={0}
        style={{
          height: 225,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}>
        <Icons.Bush fill={foreground} width={cardWidth} />
        <Expanded borderRadius={0} backgroundColor={foreground} />
      </Column>
    );
  };

  return (
    <BaseButton
      onPress={onPress}
      backgroundColor={background}
      borderRadius={theme.layouts.large}
      justifyContent="center"
      style={{
        flexDirection: 'column',
        width: cardWidth,
        height: MAX_CARD_HEIGHT_SIZE,
        overflow: 'hidden',
        marginLeft: theme.layouts.large,
        marginBottom: theme.layouts.large,
        alignSelf: 'flex-start',
      }}>
      {renderBush()}
      <Image
        source={image}
        resizeMethod="resize"
        resizeMode="contain"
        style={{ width: 108, height: 182 }}
      />
      <SizedBox.Large height />
      <H4 fontWeight="bold" color={theme.colors.onSurface}>
        {title}
      </H4>
      <H6
        numberOfLines={2}
        color={theme.colors.onSurfaceVariant}
        style={{ height: theme.lineHeights.h6 * 2 }}>
        {description}
      </H6>
    </BaseButton>
  );
}
