import { H2, H5, H6, SH3, SizedBox } from '@/components';
import { Image, ImageRequireSource, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';

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

// Two panels side by side. Each panel gets a flex share of the row's width
// (a row has a definite width, so flex is safe here) and stretches to the
// row's height, which comes from minHeight or the taller panel's content.
// Nothing inside relies on flex to get a height.
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
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        alignSelf: 'stretch',
        borderRadius: 6,
        borderWidth: 3,
        borderColor: theme.colors.divider,
        minHeight: 225,
        overflow: 'hidden',
      }}>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          backgroundColor: foregroundColor,
          padding: theme.layouts.medium,
          overflow: 'hidden',
        }}>
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: primaryColor,
            borderRadius: theme.layouts.defaultRadius,
            paddingHorizontal: theme.layouts.small,
            paddingVertical: theme.layouts.small,
          }}>
          <H6 fontWeight="semi" color={theme.colors.onPrimary}>
            {name}
          </H6>
        </View>
        <SizedBox.Large height />
        <View
          style={{
            flexGrow: 1,
            alignSelf: 'stretch',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Image
            source={image}
            resizeMethod="resize"
            resizeMode="contain"
            style={{ width: '100%', maxWidth: 140, height: 120 }}
          />
        </View>
      </View>
      <View
        style={{
          flex: 1.5,
          minWidth: 0,
          justifyContent: 'space-between',
          backgroundColor,
          padding: theme.layouts.large,
        }}>
        <View>
          <H2 fontWeight="semi" alignSelf="flex-start" textAlign="left">
            {score}
          </H2>
          <H6
            fontWeight="semi"
            color={theme.colors.onSurfaceVariant}
            alignSelf="flex-start"
            textAlign="left">
            {t('screen.dashboard.pointsLabel')}
          </H6>
        </View>
        <SizedBox.Large height />
        <View>
          <H5
            color={primaryColor}
            fontWeight="semi"
            alignSelf="flex-start"
            textAlign="left">
            {`${progress}/${maxProgress}`}
          </H5>
          <SH3
            fontWeight="semi"
            color={theme.colors.onSurfaceVariant}
            alignSelf="flex-start"
            textAlign="left">
            {t('screen.dashboard.completedLevelsLabel')}
          </SH3>
        </View>
      </View>
    </View>
  );
}
