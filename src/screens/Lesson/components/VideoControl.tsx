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
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import { Image } from 'expo-image';

// Shared by the compact-layout threshold math and the button/slider JSX below,
// so resizing a control can't silently desync from the breakpoint that was
// derived from its old size.
const VOLUME_ICON_SIZE = 36;
const VOLUME_SLIDER_MAX = 100;
const SKIP_BUTTON_SIZE = 55;
const PLAY_BUTTON_SIZE = 65;

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // F-01: Android now renders this bar instead of expo-av's native controls,
  // which exposed nothing to the accessibility tree.
  const isAndroid = Platform.OS === 'android';
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
    () => Math.min(VOLUME_SLIDER_MAX, controllerWidth / 4),
    [controllerWidth],
  );
  // The top row centres the transport buttons (rewind + gap + play + gap +
  // forward) by giving it a volume group of matching width on BOTH sides —
  // the left one real (icon + gap + a slider of up to VOLUME_SLIDER_MAX), the
  // right one an empty Expanded spacer of the same notional size. So the row only
  // fits without the slider overlapping the rewind button when the full
  // controller (including its own horizontal padding on each side) can hold
  // 2 * volumeGroupWidth + transportWidth + 2 * theme.layouts.large. With the
  // current sizes that's 511 + 2 * 16 = 543: a 411dp phone (411 < 543) is
  // compact, a 720 tablet/desktop (720 >= 543) stays wide. Below that, drop
  // to a stacked layout: transport on top, volume below.
  const compactVolumeThreshold = useMemo(() => {
    const volumeGroupWidth =
      VOLUME_ICON_SIZE + theme.layouts.large + VOLUME_SLIDER_MAX;
    const transportWidth =
      SKIP_BUTTON_SIZE + PLAY_BUTTON_SIZE + SKIP_BUTTON_SIZE +
      2 * theme.layouts.large;
    return 2 * volumeGroupWidth + transportWidth + 2 * theme.layouts.large;
  }, [theme.layouts.large]);
  const isCompact = useMemo(
    () => controllerWidth < compactVolumeThreshold,
    [controllerWidth, compactVolumeThreshold],
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
    // On Android the bar is permanently visible, so hiding it would only set
    // disabled=true and silently kill every control. Also the accessible
    // behaviour: controls a screen reader can find do not vanish on a timer.
    if (isAndroid) return;
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

  const renderVolume = (sliderWidth: number) => (
    <>
      {/* <Icons.VideoVolumebtn /> */}
      <Image
        source={Images.VolumeButton}
        style={{ width: VOLUME_ICON_SIZE, height: VOLUME_ICON_SIZE }}
        accessible={false}
        importantForAccessibility="no"
      />
      <SizedBox.Large width />
      <Slider
        accessibilityLabel={t('player.volume')}
        style={{ width: sliderWidth, height: 40 }}
        minimumValue={0}
        maximumValue={1}
        minimumTrackTintColor={theme.colors.secondary}
        maximumTrackTintColor={theme.colors.placeholder}
        thumbTintColor={theme.colors.secondary}
        value={volume}
        onSlidingComplete={handleSetVolume}
        //
      />
    </>
  );

  const renderTransport = () => (
    <Row flexDirection="row">
      <BaseButton
        onPress={handleSeekRewind}
        accessibilityRole="button"
        accessibilityLabel={t('player.rewind')}>
        <Image
          source={Images.RewindButton}
          style={{
            borderRadius: 100,
            width: SKIP_BUTTON_SIZE,
            height: SKIP_BUTTON_SIZE,
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
      <BaseButton
        onPress={handlePlayPause}
        accessibilityRole="button"
        accessibilityLabel={t(isPlaying ? 'player.pause' : 'player.play')}>
        <Image
          source={isPlaying ? Images.PauseButton : Images.PlayButton}
          style={{
            borderRadius: 100,
            width: PLAY_BUTTON_SIZE,
            height: PLAY_BUTTON_SIZE,
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
      <BaseButton
        onPress={handleSeekForward}
        accessibilityRole="button"
        accessibilityLabel={t('player.forward')}>
        <Image
          source={Images.ForwardButton}
          style={{
            borderRadius: 100,
            width: SKIP_BUTTON_SIZE,
            height: SKIP_BUTTON_SIZE,
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
  );

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
        {isCompact ? (
          <Row justifyContent="center">{renderTransport()}</Row>
        ) : (
          <Row>
            <Expanded flexDirection="row">
              {renderVolume(volumeSliderWidth)}
            </Expanded>
            {renderTransport()}
            <Expanded />
          </Row>
        )}
        <Row justifyContent="center">
          <H4>{readableSeekPosition}</H4>
          <SizedBox.Large width />
          <Slider
            accessibilityLabel={t('player.seek')}
            accessibilityValue={{
              text: t('player.elapsedOfTotal', {
                elapsed: readableSeekPosition,
                total: readableDuration,
              }),
            }}
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
        {isCompact && (
          <>
            <SizedBox.Medium height />
            <Row justifyContent="center">
              {renderVolume(Math.min(240, controllerWidth * 0.5))}
            </Row>
          </>
        )}
      </Animated.View>
    );
  };

  return (
    <Pressable
      onPress={handleControllerState}
      // accessible={false} keeps this wrapper out of the accessibility tree so
      // the controls inside stay individually focusable, instead of being
      // flattened into one unlabelled "button" covering the whole player.
      accessible={false}
      style={{
        position: 'absolute',
        top: theme.layouts.large,
        bottom: 0,
        left: 0,
        right: 0,
        opacity: isAndroid ? 1 : opacityValue,
      }}>
      <IconButton
        onPress={onClosePress}
        icon="close"
        accessibilityLabel={t('button.close')}
        buttonColor={`rgba(255,255,255, 0.8)`}
        iconSize={theme.fontSizes.h3}
        paddingHorizontal={theme.layouts.small}
        paddingVertical={theme.layouts.small}
        style={{
          position: 'absolute',
          // Android draws under the status bar, so the close button has to
          // clear it (see #80); elsewhere the safe area is already applied.
          top: isAndroid
            ? insets.top + theme.layouts.large * 2
            : theme.layouts.large,
          right: theme.layouts.large,
          borderRadius: 150,
          opacity: isAndroid ? 1 : opacityValue,
        }}
      />
      {(Platform.OS === 'web' || isAndroid) && renderController()}
    </Pressable>
  );
}