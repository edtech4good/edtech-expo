import { File } from '@/models';
import _ from 'lodash';
import Row from '../layouts/Row';
import { Pressable } from 'react-native';
import { Images } from '@/assets';
import { Image } from 'expo-image';
import { useTheme } from 'styled-components/native';
import { useParentLayout, useResource } from '@/services';
import { useMemo } from 'react';

interface Props {
  id: string;
  file: File;
  onPress?: () => void;
}

export default function PracticeFile({
  id,
  file,
  onPress = () => undefined,
}: Props) {
  const theme = useTheme();
  const parentLayout = useParentLayout();

  if (_.isEmpty(file)) return <Row />;

  // console.log(`${process.env.EXPO_PUBLIC_RESOURCE_URL}/${file.filename}`);

  const imageSource = useResource({ name: file.filename }, [id, file]);

  const imageSize = useMemo(
    () =>
      parentLayout
        ? Math.min(parentLayout.height, parentLayout.width) * 0.9
        : 256,
    [parentLayout],
  );

  if (file.filetype === 6)
    return (
      <Image
        source={imageSource}
        contentFit="contain"
        style={{
          width: imageSize,
          height: imageSize,
          borderRadius: theme.layouts.defaultRadius,
        }}
      />
    );

  return (
    <Pressable onPress={onPress}>
      <Image
        source={Images.SoundButton}
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          shadowColor: theme.colors.shadow,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0.25,
          shadowRadius: 15,
        }}
      />
    </Pressable>
  );
}
