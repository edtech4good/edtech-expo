import { Images } from '@/assets';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';
import H3 from './texts/H3';
import H4 from './texts/H4';
import { Image } from 'expo-image';

interface Props {
  score: string;
}

export default function ScoreStamp({ score }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: 132,
        height: 132,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Image
        source={Images.ScoreBadge}
        style={{
          position: 'absolute',
          width: 132,
          height: 132,
          resizeMode: 'contain',
        }}
      />
      <H4 fontWeight="semi" color={theme.colors.onPrimary}>
        {score}
      </H4>
    </View>
  );
}
