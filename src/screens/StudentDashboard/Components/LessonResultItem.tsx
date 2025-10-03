import { Column, Expanded, H2, H5, H6, Row, SH3, SizedBox } from '@/components';
import { Image, ImageRequireSource, View } from 'react-native';
import { useTheme } from 'styled-components/native';

export interface LessonResultItemProps {
  backgroundColor: string;
  foregroundColor: string;
  primaryColor: string;
  image: ImageRequireSource;
  name: string;
  score: string;
  progress: number;
  maxProgress: number;
  onPress?: () => void;
}

export default function LessonResultItem({
  foregroundColor,
  backgroundColor,
  primaryColor,
  image,
  name,
  score,
  progress,
  maxProgress,
}: LessonResultItemProps) {
  const theme = useTheme();

  return (
    <Row
      flexDirection="row"
      borderRadius={6}
      style={{
        borderWidth: 3,
        borderColor: theme.colors.divider,
        height: 225,
        maxWidth: 370,
      }}>
      <Expanded
        backgroundColor={foregroundColor}
        style={{ padding: theme.layouts.large }}>
        <View
          style={{
            backgroundColor: primaryColor,
            borderRadius: theme.layouts.defaultRadius,
            paddingHorizontal: theme.layouts.large,
            paddingVertical: theme.layouts.small,
          }}>
          <H6 fontWeight="semi" color={theme.colors.onPrimary}>
            {name}
          </H6>
        </View>
        <SizedBox.Large height />
        <SizedBox.Large height />
        <Image
          source={image}
          resizeMethod="resize"
          resizeMode="contain"
          style={{ height: 110 }}
        />
      </Expanded>
      <Expanded
        flex={1.5}
        backgroundColor={backgroundColor}
        justifyContent="center"
        style={{ padding: theme.layouts.large }}>
        <H2 fontWeight="semi" alignSelf="flex-start">
          {score}
        </H2>
        <H6
          fontWeight="semi"
          color={theme.colors.onSurfaceVariant}
          alignSelf="flex-start">
          Points
        </H6>
        <Expanded />
        <H5 color={primaryColor} fontWeight="semi" alignSelf="flex-start">
          {`${progress}/${maxProgress}`}
        </H5>
        <SH3
          fontWeight="semi"
          color={theme.colors.onSurfaceVariant}
          alignSelf="flex-start">
          Completed Levels
        </SH3>
      </Expanded>
    </Row>
  );
}
