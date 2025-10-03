import { useParentLayout } from '@/services';
import { Image, ImageProps } from 'expo-image';
import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

interface Props extends ImageProps {
  relativesize?: number;
  fallbacksize?: number;
  maxsize?: number;
}

export default function ChildImage(props: Props) {
  const theme = useTheme();
  const parentLayout = useParentLayout();
  const { relativesize = 0.8, maxsize = 0, fallbacksize } = props;

  const imageSize = useMemo(
    () =>
      parentLayout
        ? Math.min(parentLayout.height, parentLayout.width) * relativesize
        : fallbacksize,
    [parentLayout],
  );

  const restrictedSize = useMemo(
    () => (maxsize > 0 ? Math.min(imageSize, maxsize) : imageSize),
    [imageSize, maxsize],
  );

  return (
    <Image
      {...props}
      style={[
        {
          width: restrictedSize,
          height: restrictedSize,
          borderRadius: theme.layouts.defaultRadius,
          resizeMode: 'contain',
        },
        props.style,
      ]}
    />
  );
}
