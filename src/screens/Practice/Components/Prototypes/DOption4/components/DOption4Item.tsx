import { ShakingWrapper } from '@/components';
import { ShakingHandler } from '@/models';
import { useResource } from '@/services';
import { Image } from 'expo-image';
import _ from 'lodash';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Pressable } from 'react-native';

interface Props {
  id: string;
  source: string;
  disabled?: boolean;
  onPress: () => void;
}

export default forwardRef<ShakingHandler, Props>(function DOption4Item(
  { id, source, onPress, disabled = false }: Props,
  ref,
) {
  const shakingRef = useRef<ShakingHandler>(null);
  const fileSource = useResource(
    {
      name: source,
    },
    [source],
  );

  console.log('File Source: ', fileSource);

  useImperativeHandle(ref, () => {
    return {
      async shake() {
        await shakingRef.current?.shake();
      },
      async stop() {
        await shakingRef.current?.stop();
      },
    };
  });

  return (
    <ShakingWrapper ref={shakingRef}>
      <Pressable onPress={onPress}>
        <Image
          source={fileSource}
          focusable={false}
          style={{
            width: 222,
            height: 111,
            resizeMode: 'contain',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 0,
            },
            shadowOpacity: 0.25,
            shadowRadius: 15,
          }}
        />
      </Pressable>
    </ShakingWrapper>
  );
});
