import {
  OptionImage,
  ShakingWrapper,
  useOptionImageSlot,
} from '@/components';
import { ShakingHandler } from '@/models';
import { useResource } from '@/services';
import _ from 'lodash';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  id: string;
  source: string;
  /** The option's text, shown when the picture is missing. */
  label?: string;
  disabled?: boolean;
  onPress: () => void;
}

export default forwardRef<ShakingHandler, Props>(function DOption4Item(
  { id, source, label, onPress, disabled = false }: Props,
  ref,
) {
  const theme = useTheme();
  const shakingRef = useRef<ShakingHandler>(null);
  const fileSource = useResource(
    {
      name: source,
    },
    [source],
  );

  const slot = useOptionImageSlot(fileSource, label);

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
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={slot.accessibilityLabel}>
        <OptionImage
          source={fileSource}
          slot={slot}
          focusable={false}
          contentFit="contain"
          style={{
            width: 222,
            height: 111,
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
    </ShakingWrapper>
  );
});
