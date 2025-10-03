import { Images } from '@/assets';
import {
  BaseButton,
  Expanded,
  H4,
  H5,
  H6,
  Row,
  SH3,
  SizedBox,
} from '@/components';
import { useBreakpoint } from '@/services';
import _ from 'lodash';
import { Image, useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';

export interface LessonItemProps {
  title: string;
  description: string;
  onPress?: () => void;
}

export default function LessonItem({
  title,
  description,
  onPress = () => undefined,
}: LessonItemProps) {
  const theme = useTheme();

  const { width } = useWindowDimensions();
  const itemType = useBreakpoint({
    mobile: 'mobile',
    phablet: 'phablet',
    desktop: 'desktop',
    tablet: 'tablet',
  });

  const renderMobileItem = () => {
    console.log('rending mobile');
    return (
      <BaseButton
        onPress={onPress}
        backgroundColor={theme.colors.cards[0].primary}
        borderRadius={16}
        paddingHorizontal={theme.layouts.large}
        paddingVertical={theme.layouts.large}
        style={{
          flexDirection: 'row',
          width: width - theme.layouts.large * 2,
          // marginLeft: theme.layouts.large,
          marginRight: theme.layouts.large,
          marginBottom: theme.layouts.large,
        }}>
        <Row>
          <Image
            source={Images.LessonPreview}
            resizeMethod="resize"
            resizeMode="contain"
            style={{ width: 195, height: 195, backgroundColor: 'red' }}
          />
        </Row>
        <SizedBox.Large width />
        <Expanded justifyContent="center">
          <H6 fontWeight="bold" color={theme.colors.onSurface}>
            {title}
          </H6>
          <SH3 color={theme.colors.onSurfaceVariant}>{description}</SH3>
        </Expanded>
        {/* <SizedBox.Large height /> */}
      </BaseButton>
    );
  };

  const renderDefaultItem = () => {
    return (
      <BaseButton
        onPress={onPress}
        backgroundColor={theme.colors.cards[0].primary}
        borderRadius={16}
        paddingHorizontal={theme.layouts.large}
        paddingVertical={theme.layouts.large}
        style={{
          flexDirection: 'column',
          marginRight: theme.layouts.large,
          marginBottom: theme.layouts.large,
        }}>
        <Row>
          <Image
            source={Images.LessonPreview}
            resizeMethod="resize"
            resizeMode="contain"
            style={{ width: 195, height: 195 }}
          />
        </Row>
        <SizedBox.Large height />
        <SizedBox.Large height />
        <H6
          color={theme.colors.onSurface}
          fontWeight="bold"
          numberOfLines={1}
          style={{ width: 195 }}>
          {title}
        </H6>
        <SH3 color={theme.colors.onSurfaceVariant}>{description}</SH3>
        <SizedBox.Large height />
      </BaseButton>
    );
  };

  return (
    <>
      {itemType === 'mobile' && renderMobileItem()}
      {itemType === 'phablet' && renderDefaultItem()}
      {itemType === 'tablet' && renderDefaultItem()}
      {itemType === 'desktop' && renderDefaultItem()}
    </>
  );
  // if (!_.isEmpty(itemToRender)) return itemToRender();
  // return <SizedBox width={16} height={16} backgroundColor="green" />;
}
