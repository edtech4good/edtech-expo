import {
  BaseButton,
  Column,
  Expanded,
  H4,
  H6,
  SH3,
  SizedBox,
  TitleText,
} from '@/components';
import { useBreakpoint } from '@/services';
import {
  Image,
  ImageRequireSource,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';

export interface UnitItemProps {
  backgroundColor: string;
  primaryColor: string;
  image: ImageRequireSource;
  title: string;
  description: string;
  progress: number;
  onPress?: () => void;
}

export default function UnitItem({
  backgroundColor,
  description,
  image,
  primaryColor,
  progress,
  title,
  onPress,
}: UnitItemProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = useBreakpoint({
    desktop: 395,
    tablet: Math.min((width - theme.layouts.large * 4) / 3, 395),
    phablet: Math.min((width - theme.layouts.large * 3) / 2, 395),
    mobile: width - theme.layouts.large * 2,
  });

  return (
    <BaseButton
      onPress={onPress}
      backgroundColor={backgroundColor}
      borderRadius={16}
      style={{
        flexDirection: 'row',
        width: cardWidth,
        height: 176,
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
          numberOfLines={2}
          textAlign="left"
          alignSelf="flex-start">
          {title}
        </H6>
        <SH3
          color={theme.colors.onSurfaceVariant}
          alignSelf="flex-start"
          textAlign="left">
          {description}
        </SH3>
        <SizedBox.Large height />
        <SH3
          color={primaryColor}
          alignSelf="flex-start">{`Progress ${progress}%`}</SH3>
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
              backgroundColor: primaryColor,
            }}
          />
        </View>
      </Expanded>
    </BaseButton>
  );
}
