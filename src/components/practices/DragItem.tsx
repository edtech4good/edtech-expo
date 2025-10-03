import { Images } from '@/assets';
import { MatchingItemHandler, MatchingItemProps } from '@/models';
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { Animated, Image, Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Audio } from 'expo-av';
import H4 from '../texts/H4';
import _ from 'lodash';
import { useResource } from '@/services';
import H6 from '../texts/H6';
import SH3 from '../texts/SH3';

interface DragItemProps extends MatchingItemProps {
  isShowingAnswer?: boolean;
}

export default forwardRef<MatchingItemHandler, DragItemProps>(function DragItem(
  {
    onPress,
    option,
    isSelected = false,
    disabled = false,
    isShowingAnswer = false,
  }: DragItemProps,
  ref,
) {
  const theme = useTheme();
  const rotateZ = new Animated.Value(0);
  let animatedObject: Animated.CompositeAnimation;
  const scale = useMemo(() => new Animated.Value(0), []); // For zoom animation
  const opacity = useMemo(() => new Animated.Value(0), []); // For fade animation

  const questionAssociateFile = useMemo(
    () => _.get(option, 'questionassociate.questionassociatefile', undefined),
    [option],
  );

  const file = useMemo(() => questionAssociateFile, [questionAssociateFile]);

  const fileSource = useResource(
    {
      name: _.get(file, 'filename', ''),
    },
    [option, file],
  );

  const playbackObject = useMemo(() => new Audio.Sound(), []);

  useImperativeHandle(
    ref,
    () => {
      return {
        select() {
          // console.log('SELECT', animatedObject);
          startShaking();
        },
        deselect() {
          if (!animatedObject) return;
          animatedObject.reset();
          rotateZ.resetAnimation();
          zoomInFadeIn();
        },
        hide() {
          if (!animatedObject) return;
          animatedObject.reset();
          zoomOutFadeOut();
        },
        show() {
          zoomInFadeIn();
        },
      };
    },
    [],
  );

  useEffect(() => {
    setTimeout(() => {
      zoomInFadeIn();
    }, 100);
  }, []);

  useEffect(() => {
    if (isShowingAnswer) zoomOutFadeOut();
    else zoomInFadeIn();
  }, [isShowingAnswer]);

  useEffect(() => {
    if (_.isEmpty(fileSource)) return;
    handleLoadAudio();

    return () => {
      playbackObject.unloadAsync();
    };
  }, [fileSource]);

  const handleLoadAudio = async () => {
    await playbackObject.unloadAsync();
    await playbackObject.loadAsync(
      { uri: fileSource },
      { shouldPlay: false, isLooping: false },
    );
  };

  const startShaking = () => {
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

    animatedObject.start();
  };

  const zoomOutFadeOut = (callback?: () => void) => {
    Animated.parallel([
      // Run zoom and fade animations simultaneously
      Animated.timing(scale, {
        toValue: 0.5, // Zoom out to 50% size
        duration: 200, // Animation duration
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0, // Fade out to completely transparent
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };
  const zoomInFadeIn = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1, // Zoom back to original size
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, // Fade back to fully opaque
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const handlePress = () => {
    if (opacity._value === 0) return;
    onPress(option);
  };

  const handleAudioIconPress = async () => {
    if (_.isEmpty(option.questionoptionfile)) return;
    await playbackObject.playFromPositionAsync(0);
    // const { sound: playbackObject } = await Audio.Sound.createAsync(
    //   {
    //     uri: fileSource,
    //   },
    //   { shouldPlay: true },
    // );
  };

  return (
    <Animated.View
      style={[
        {
          opacity,
          transform: [
            { scale },
            {
              rotateZ: rotateZ.interpolate({
                // Interpolate rotation value
                inputRange: [-10, 0, 10], // Map rotation values
                outputRange: ['-2deg', '0deg', '2deg'], // Map to desired rotation angles
              }),
            },
          ],
        },
        file?.filetype !== 6
          ? {
              elevation: 7,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 0,
              },
              shadowOpacity: 0.25,
              shadowRadius: 7,
            }
          : {},
      ]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={{
          width: 300,
          height: 105,
          justifyContent: 'center',
        }}>
        {_.isEmpty(file?.filename) && (
          <Image
            source={Images.MatchingItemBackground}
            resizeMethod="resize"
            resizeMode="cover"
            width={300}
            height={105}
            style={{
              width: 300,
              height: 105,
              position: 'absolute',
            }}
          />
        )}
        {_.isEmpty(file?.filename) && (
          <SH3
            color={theme.colors.onSecondary}
            fontWeight="semi"
            alignSelf="center"
            style={{
              position: 'absolute',
              marginHorizontal: theme.layouts.large,
            }}>
            {_.get(option, 'questionassociate.questionassociatetext', '')}
          </SH3>
        )}
        {!_.isEmpty(file?.filename) && file?.filetype !== 6 && (
          <Image
            source={Images.MatchingItemBackground}
            resizeMethod="resize"
            resizeMode="cover"
            style={{
              width: 300,
              height: 105,
              position: 'absolute',
            }}
          />
        )}
        {!_.isEmpty(file?.filename) && file?.filetype !== 6 && (
          <Pressable
            onPress={handleAudioIconPress}
            style={{ width: 65, height: 65, alignSelf: 'center' }}>
            <Image
              resizeMethod="resize"
              resizeMode="contain"
              source={Images.Audio}
              style={{ alignSelf: 'center', width: 65, height: 65 }}
            />
          </Pressable>
        )}

        {!_.isEmpty(file?.filename) && file?.filetype === 6 && (
          <Image
            resizeMethod="resize"
            resizeMode="contain"
            width={300}
            height={105}
            source={{ uri: fileSource }}
            style={{ alignSelf: 'center', width: 300, height: 100 }}
          />
        )}
      </Pressable>
    </Animated.View>
  );
});
