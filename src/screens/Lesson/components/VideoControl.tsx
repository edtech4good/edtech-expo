import { Images } from '@/assets';
import {
  BaseButton,
  Expanded,
  H4,
  IconButton,
  Row,
  SizedBox,
} from '@/components';
import { useBreakpoint } from '@/services';
import { msToDuration } from '@/utils';
import Slider from '@react-native-community/slider';
import { AVPlaybackStatusSuccess } from 'expo-av';
import { useEffect, useMemo, useRef } from 'react';
import { useController, useForm } from 'react-hook-form';
import {
  Animated,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { Image } from 'expo-image';

interface VideoControllerProps {
  disabled?: boolean;
  onPlayPausePress?: () => void;
  onForwardPress?: () => void;
  onRewindPress?: () => void;
  onSeekChanged?: (val: number) => void;
  onVolumeChanged?: (val: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClosePress?: () => void;
}

export default function VideoControl({
  onClosePress = () => undefined,
  onPlayPausePress = () => undefined,
  onForwardPress = () => undefined,
  onRewindPress = () => undefined,
  onSeekChanged = () => undefined,
  onVolumeChanged = () => undefined,
}: VideoControllerProps) {
  const theme = useTheme();
  const opacityValue = useMemo(() => new Animated.Value(1), []);
  const methods = useForm<{ disabled: boolean }>({
    defaultValues: { disabled: false },
  });

  const { width } = useWindowDimensions();
  const controllerWidth = useBreakpoint({
    mobile: width,
    phablet: width,
    desktop: 720,
    tablet: 720,
  });

  const controllerBottomLocation = useMemo(() => theme.layouts.large * 2, []);
  const volumeSliderWidth = useMemo(
    () => Math.min(100, controllerWidth / 4),
    [controllerWidth],
  );

  const { field } = useController({ name: 'stat' });
  const { positionMillis, durationMillis, volume, isPlaying } =
    field.value as AVPlaybackStatusSuccess;

  const readableSeekPosition = useMemo(
    () => msToDuration(positionMillis),
    [positionMillis],
  );
  const readableDuration = useMemo(
    () => msToDuration(durationMillis ?? 0),
    [durationMillis],
  );

  useEffect(() => {
    if (!isPlaying) return;
    hideController();
  }, [isPlaying]);

  const handleFocus = () => {
    showController(isPlaying);
  };

  const handleBlur = () => {
    hideController();
  };

  const handleSeekForward = () => {
    const isDisabled = methods.getValues('disabled');
    if (isDisabled === true) return;
    onForwardPress();
  };

  const handleSeekRewind = () => {
    const isDisabled = methods.getValues('disabled');
    if (isDisabled === true) return;
    onRewindPress();
  };

  const handlePlayPause = () => {
    const isDisabled = methods.getValues('disabled');
    if (isDisabled === true) return;
    onPlayPausePress();
  };

  const handleSetVolume = (val: number) => {
    const isDisabled = methods.getValues('disabled');
    if (isDisabled === true) return;
    onVolumeChanged(val);
  };

  const handleSetSeek = (val: number) => {
    const isDisabled = methods.getValues('disabled');
    if (isDisabled === true) return;
    onSeekChanged(val);
  };

  const stopOpacityAnimation = async () => {
    return new Promise<number>(resolve => {
      opacityValue.stopAnimation(val => {
        resolve(val);
      });
    });
  };

  const showController = async (hideAfterAWhile: boolean = false) => {
    const currentOpacity = await stopOpacityAnimation();
    if (currentOpacity === 1) return;
    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 700,
      useNativeDriver: Platform.OS === 'web' ? false : true,
    }).start(() => {
      methods.setValue('disabled', false);
      if (!hideAfterAWhile) return;
      // if (timer) clearTimeout(timer);
      // timer = setTimeout(() => {
      //   hideController();
      //   isAnimating = false;
      // }, 5000);
    });
  };

  const hideController = async () => {
    const currentOpacity = await stopOpacityAnimation();
    if (currentOpacity === 0) return;
    Animated.timing(opacityValue, {
      toValue: 0,
      duration: 700,
      useNativeDriver: Platform.OS === 'web' ? false : true,
    }).start(() => {
      methods.setValue('disabled', true);
    });
  };

  const handleControllerState = async () => {
    // If video_not_playing => show_controller_permanently
    if (!isPlaying) {
      showController();
      return;
    }

    const currentOpacity = await stopOpacityAnimation();
    if (currentOpacity === 1) hideController();
    else showController();
  };

  if (!controllerWidth) return <SizedBox.Large width />;

  const renderController = () => {
    return (
      <Animated.View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.layouts.defaultRadius,
          bottom: controllerBottomLocation,
          padding: theme.layouts.large,
          width: controllerWidth,
          opacity: Platform.OS === 'android' ? 1 : opacityValue,
        }}>
        <Row>
          <Expanded flexDirection="row">
            {/* <Icons.VideoVolumebtn /> */}
            <Image
              source={Images.VolumeButton}
              style={{ width: 36, height: 36 }}
            />
            <SizedBox.Large width />
            <Slider
              style={{ width: volumeSliderWidth, height: 40 }}
              minimumValue={0}
              maximumValue={1}
              minimumTrackTintColor={theme.colors.secondary}
              maximumTrackTintColor={theme.colors.placeholder}
              thumbTintColor={theme.colors.secondary}
              value={volume}
              onSlidingComplete={handleSetVolume}
              //
            />
          </Expanded>
          <Row flexDirection="row">
            <BaseButton onPress={handleSeekRewind}>
              <Image
                source={Images.RewindButton}
                style={{
                  borderRadius: 100,
                  width: 55,
                  height: 55,
                  elevation: 7,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: {
                    width: 0,
                    height: 0,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 15,
                }}
              />
            </BaseButton>
            <SizedBox.Large width />
            <BaseButton onPress={handlePlayPause}>
              <Image
                source={isPlaying ? Images.PauseButton : Images.PlayButton}
                style={{
                  borderRadius: 100,
                  width: 65,
                  height: 65,
                  elevation: 7,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: {
                    width: 0,
                    height: 0,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 15,
                }}
              />
            </BaseButton>
            <SizedBox.Large width />
            <BaseButton onPress={handleSeekForward}>
              <Image
                source={Images.ForwardButton}
                style={{
                  borderRadius: 100,
                  width: 55,
                  height: 55,
                  elevation: 7,
                  shadowColor: theme.colors.shadow,
                  shadowOffset: {
                    width: 0,
                    height: 0,
                  },
                  shadowOpacity: 0.25,
                  shadowRadius: 15,
                }}
              />
            </BaseButton>
          </Row>
          <Expanded />
        </Row>
        <Row justifyContent="center">
          <H4>{readableSeekPosition}</H4>
          <SizedBox.Large width />
          <Slider
            style={{ width: controllerWidth * 0.65, height: 40 }}
            minimumValue={0}
            maximumValue={durationMillis}
            value={positionMillis}
            minimumTrackTintColor={theme.colors.secondary}
            maximumTrackTintColor={theme.colors.placeholder}
            thumbTintColor={theme.colors.secondary}
            onSlidingComplete={handleSetSeek}
          />
          <SizedBox.Large width />
          <H4>{`${readableDuration}`}</H4>
        </Row>
      </Animated.View>
    );
  };

  if (Platform.OS === 'android')
    return (
      <IconButton
        onPress={onClosePress}
        icon="close"
        buttonColor={`rgba(255,255,255, 0.8)`}
        iconSize={theme.fontSizes.h3}
        paddingHorizontal={theme.layouts.small}
        paddingVertical={theme.layouts.small}
        style={{
          position: 'absolute',
          top: theme.layouts.large * 2,
          right: theme.layouts.large,
          borderRadius: 150,
          opacity: Platform.OS === 'android' ? 1 : opacityValue,
        }}
      />
    );

  return (
    <Pressable
      onPress={handleControllerState}
      style={{
        position: 'absolute',
        top: theme.layouts.large,
        bottom: 0,
        left: 0,
        right: 0,
        opacity: Platform.OS === 'android' ? 1 : opacityValue,
      }}>
      <IconButton
        onPress={onClosePress}
        icon="close"
        buttonColor={`rgba(255,255,255, 0.8)`}
        iconSize={theme.fontSizes.h3}
        paddingHorizontal={theme.layouts.small}
        paddingVertical={theme.layouts.small}
        style={{
          position: 'absolute',
          top: theme.layouts.large,
          right: theme.layouts.large,
          borderRadius: 150,
          opacity: Platform.OS === 'android' ? 1 : opacityValue,
        }}
      />
      {Platform.OS === 'web' && renderController()}
    </Pressable>
  );
}
