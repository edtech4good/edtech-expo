import { useRef, useState } from 'react';
import { Animated, Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';
import H4 from '../texts/H4';
import H1 from '../texts/H1';

export default function ClickableTextbox() {
  const theme = useTheme();
  const [count, setCount] = useState<number>(0);
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    // zoom out
    // Animated.timing(scaleAnimation, {
    //   toValue: 0.9,
    //   duration: 100,
    //   useNativeDriver: true,
    // }).start();

    Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRelease = async () => {
    await setCount(val => val + 1);
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // const handlePress = async () => {
  //   Animated.sequence([
  //     Animated.parallel([
  //       Animated.timing(scaleAnimation, {
  //         toValue: 0.85,
  //         duration: 150,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(rotateAnimation, {
  //         toValue: 30,
  //         duration: 150,
  //         useNativeDriver: false,
  //       }),
  //     ]),
  //     Animated.parallel([
  //       Animated.timing(scaleAnimation, {
  //         toValue: 1,
  //         duration: 150,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(rotateAnimation, {
  //         toValue: 0,
  //         duration: 150,
  //         useNativeDriver: true,
  //       }),
  //     ]),
  //   ]).start(() => {
  //     setCount(val => val + 1);
  //   });
  // };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handleRelease}>
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleAnimation }],
          },
        ]}>
        <H1>{`${count}`}</H1>
      </Animated.View>
    </Pressable>
  );
}
