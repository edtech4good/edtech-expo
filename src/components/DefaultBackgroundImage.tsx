import { Images } from '@/assets';
import { useEffect } from 'react';
import { Image, useWindowDimensions } from 'react-native';

export default function DefaultBackgroundImage() {
  const { width } = useWindowDimensions();

  useEffect(() => {}, [width]);

  return (
    <Image
      source={Images.DefaultBackground}
      resizeMethod="resize"
      resizeMode="stretch"
      width={width}
      style={{
        width,
        maxHeight: 800,
        position: 'absolute',
        bottom: 0,
      }}
    />
  );
}
