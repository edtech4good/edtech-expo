import { View } from 'react-native';

interface Props {
  opacity?: number;
}

export default function BlackVeil({ opacity = 0.5 }: Props) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(0,0,0, ${opacity})`,
      }}
    />
  );
}
