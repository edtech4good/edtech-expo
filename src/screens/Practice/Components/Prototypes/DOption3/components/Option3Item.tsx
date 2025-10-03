import { Images } from '@/assets';
import { H3, ShakingWrapper } from '@/components';
import { Question, ShakingHandler } from '@/models';
import { useResource } from '@/services';
import { Image } from 'expo-image';
import _ from 'lodash';
import { useRef } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  question: Question;
  onToggle: (isSelected: boolean) => void;
}

export default function Option3Item({
  question,
  onToggle = () => undefined,
}: Props) {
  const theme = useTheme();
  const shakingRef = useRef<ShakingHandler>(null);

  const source = useResource(
    { name: _.get(question, 'questionobject.questionfile.filename', '') },
    [question],
  );

  const handlePress = () => {
    if (!shakingRef.current) return;
    if (!shakingRef.current.isShaking) return;
    const isShaking = shakingRef.current.isShaking();
    if (isShaking) shakingRef.current.stop();
    else shakingRef.current.shake();
    onToggle(!isShaking);
  };

  return (
    <ShakingWrapper ref={shakingRef}>
      <Pressable
        onPress={handlePress}
        style={{
          width: 200,
          height: 200,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.layouts.defaultRadius,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: theme.layouts.divider,
          borderColor: theme.colors.divider,
          // elevation: 7,
          // shadowColor: '#000',
          // shadowOffset: {
          //   width: 0,
          //   height: 0,
          // },
          // shadowOpacity: 0.25,
          // shadowRadius: 15,
        }}>
        <Image
          source={source}
          style={{ width: 100, height: 100, resizeMode: 'contain' }}
        />
      </Pressable>
    </ShakingWrapper>
  );
}
