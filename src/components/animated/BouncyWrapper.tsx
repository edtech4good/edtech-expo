import { BouncingHandler } from '@/models';
import {
  forwardRef,
  ReactNode,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Animated, Pressable } from 'react-native';

interface BouncyWrapperProps {
  children: ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;

  animateOnPressIn?: boolean;
  animateOnPressOut?: boolean;
}

export default forwardRef<BouncingHandler, BouncyWrapperProps>(
  function BouncyWrapper(
    {
      children,
      animateOnPressIn = true,
      animateOnPressOut = true,
      onPress = () => undefined,
      onPressIn = () => undefined,
      onPressOut = () => undefined,
    },
    ref,
  ) {
    const scaleAnimation = useRef(new Animated.Value(1)).current;

    const isDisabled = useMemo(
      () => animateOnPressIn === false && animateOnPressOut === false,
      [animateOnPressIn, animateOnPressIn],
    );

    useImperativeHandle(ref, () => {
      return {
        async animatePressIn() {
          await handlePressIn();
        },
        async animatePressOut() {
          await handlePressOut();
        },
      };
    });

    const handleAnimatePressIn = async () => {
      await new Promise<void>(res => {
        Animated.timing(scaleAnimation, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }).start(() => res());
      });
    };

    const handleAnimatePressOut = async () => {
      await new Promise<void>(res => {
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.05,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          res();
        });
      });
    };

    const handlePressIn = async () => {
      if (isDisabled) return;
      await handleAnimatePressIn();
      onPressIn();
    };

    const handlePressOut = async () => {
      if (isDisabled) return;
      await handleAnimatePressOut();
      onPressOut();
    };

    const handlePress = () => {
      onPress();
    };

    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}>
        <Animated.View
          style={[
            {
              transform: [{ scale: scaleAnimation }],
            },
          ]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  },
);
