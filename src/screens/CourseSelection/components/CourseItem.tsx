import { Icons } from '@/assets_edtech';
import { BaseButton, Column, Expanded, H4, H6, SizedBox } from '@/components';
import { useBreakpoint } from '@/services';
import { Image, ImageRequireSource, useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';

export interface CourseItemProps {
  backgroundColor: string;
  foregroundColor: string;
  image: ImageRequireSource;
  title: string;
  description: string;
  onPress?: () => void;
}

export default function CourseItem({
  backgroundColor,
  description,
  foregroundColor,
  image,
  title,
  onPress = () => undefined,
}: CourseItemProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const cardWidth = useBreakpoint({
    desktop: 227,
    tablet: Math.min((width - theme.layouts.large * 6) / 5, 227),
    mobile: (width - theme.layouts.large * 3) / 5,
  });

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
        <Icons.Bush fill={foregroundColor} width={cardWidth} />
        <Expanded borderRadius={0} backgroundColor={foregroundColor} />
      </Column>
    );
  };

  return (
    <BaseButton
      onPress={onPress}
      backgroundColor={backgroundColor}
      borderRadius={16}
      justifyContent="center"
      style={{
        flexDirection: 'column',
        width: cardWidth,
        height: 340,
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
        color={theme.colors.onSurfaceVariant}
        numberOfLines={2}
        style={{ height: theme.lineHeights.h6 * 2 }}>
        {description}
      </H6>
    </BaseButton>
  );
}
