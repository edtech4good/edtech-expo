import { useParentLayout } from '@/services';
import { ImageProps } from 'expo-image';
import OptionImage from './practices/OptionImage';
import { useMemo } from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props extends ImageProps {
  /** Shown (and announced) if the picture is missing or fails to load; defaults to "Image unavailable". */
  label?: string;
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
    <OptionImage
      source={typeof props.source === 'string' ? props.source : ''}
      label={props.label}
      contentFit={props.contentFit ?? 'contain'}
      style={[
        {
          width: restrictedSize,
          height: restrictedSize,
          borderRadius: theme.layouts.defaultRadius,
        },
        props.style as StyleProp<ImageStyle>,
      ]}
    />
  );
}
