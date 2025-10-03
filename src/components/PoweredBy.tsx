import { Images } from '@/assets';
import { Image } from 'expo-image';
import { useTheme } from 'styled-components/native';

export default function PoweredBy() {
  const theme = useTheme();
  return (
    <Image
      source={Images.PoweredBy}
      style={{
        resizeMode: 'contain',
        width: 189,
        height: 60,
        position: 'absolute',
        right: theme.layouts.defaultComponentSize,
      }}
    />
  );
}
