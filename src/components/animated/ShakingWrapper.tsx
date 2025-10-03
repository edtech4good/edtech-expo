import { ShakingHandler } from '@/models';
import { forwardRef, ReactNode, useImperativeHandle, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Animated } from 'react-native';

interface ShakingProps {
  children: ReactNode;
}

export default forwardRef<ShakingHandler, ShakingProps>(function ShakingWrapper(
  { children }: ShakingProps,
  ref,
) {
  const rotateZ = new Animated.Value(0);
  let animatedObject: Animated.CompositeAnimation;

  const methods = useForm<{ isShaking: boolean }>({
    defaultValues: { isShaking: false },
  });

  useImperativeHandle(ref, () => {
    return {
      async shake() {
        await methods.setValue('isShaking', true);
        await startShaking();
      },
      async stop() {
        await methods.setValue('isShaking', false);
        stopShaking();
      },
      isShaking() {
        return methods.getValues('isShaking');
      },
    };
  });

  const startShaking = async () => {
    animatedObject = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateZ, {
          toValue: 10, // Positive value rotates clockwise
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateZ, {
          toValue: -10, // Negative value rotates counter-clockwise
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateZ, {
          toValue: 0, // Reset to original rotation
          duration: 50,
          useNativeDriver: true,
        }),
      ]),
    );

    return new Promise<void>(res => {
      animatedObject.start(() => {
        res();
      });
    });
  };

  const stopShaking = () => {
    if (!animatedObject) return;
    animatedObject.reset();
    rotateZ.setValue(0);
  };

  return (
    <Animated.View
      style={{
        transform: [
          {
            rotateZ: rotateZ.interpolate({
              // Interpolate rotation value
              inputRange: [-10, 0, 10], // Map rotation values
              outputRange: ['-2deg', '0deg', '2deg'], // Map to desired rotation angles
            }),
          },
        ],
      }}>
      <FormProvider {...methods}>{children}</FormProvider>
    </Animated.View>
  );
});
