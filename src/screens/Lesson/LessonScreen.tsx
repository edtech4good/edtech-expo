import * as React from 'react';
import {
  useWindowDimensions,
  Pressable,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { BlackVeil, Expanded, LayoutScrollView } from '@/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from 'styled-components/native';
import { FormProvider, useForm } from 'react-hook-form';
import _ from 'lodash';
import VideoControl from './components/VideoControl';
import { router, useNavigation } from 'expo-router';
import { useAppSelector } from '@/redux';
import { getSelectedModule } from '@/redux/slices';
import {
  OfflineBannerHeightContext,
  useLearning,
  useSetting,
  useDesign,
} from '@/services';
import { LessonLearning } from '@/models';
import ResumeVideoPopUp from './components/ResumeVideoPopUp';
import { StatusBar } from 'expo-status-bar';

export default function LessonScreen() {
  const navigation = useNavigation();
  const video = React.useRef<Video>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // The visible corporate OfflineBanner (OfflineBannerFrame, safeAreaTop on
  // this route) adds its own height above the screen; subtract it in
  // landscape so the full-window player (and its controls) doesn't drop
  // below the fold on the tablet rail when offline.
  const offlineBannerHeight = React.useContext(OfflineBannerHeightContext);
  const theme = useTheme();
  const { isCorporate } = useDesign();
  const controllerOpacity = React.useMemo(() => new Animated.Value(1), []);
  // Phone portrait (ROADMAP Track B, phone learner path): a full-width 16:9
  // box centred vertically. Landscape keeps the full-window player.
  const isPortrait = height > width;
  const playerWidth = width;
  const playerHeight = isPortrait
    ? Math.round((width * 9) / 16)
    : height - offlineBannerHeight;
  const isNativeDevice = React.useMemo(() => Platform.OS !== 'web', []);
  let blurTimeOut: NodeJS.Timeout;
  // const [videoSource, ]

  const methods = useForm<{ stat: AVPlaybackStatus }>({
    defaultValues: {
      stat: {
        isPlaying: false,
        volume: 1,
        durationMillis: 0,
        positionMillis: 0,
      },
    },
  });

  const selectedModule = useAppSelector(getSelectedModule);
  const lessonLearningId = (selectedModule as LessonLearning)?.lessonlearningid;
  const {
    fetch,
    source,
    progress,
    saveProgress,
    learningResource,
    loaded,
    clear,
  } = useLearning(lessonLearningId);
  // const {retrieveFile}  = useSetting();
  const [isVisible, setIsVisible] = React.useState(false);
  // Media-less learning items (corporate/DCRS content seeded as video items
  // whose file does not exist) earn their learning points on open rather
  // than on "watched to the end" — real videos keep the watched-to-end rule
  // below unchanged. Guards a single completion POST per mount: either
  // trigger (empty source, or the <Video> failing to load) could otherwise
  // fire more than once. See rpi-api#42.
  const completionPostedRef = React.useRef<boolean>(false);
  const localSource = `content://com.android.externalstorage.documents/tree/primary%3Ayour-resource-path/document/primary%3Ayour-resource-path%2Fsample.mp4`;

  React.useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const handleSaveProgressAndClear = async () => {
    try {
      const currentProgress = methods.getValues('stat.positionMillis');
      const videoDuration = methods.getValues('stat.durationMillis');
      if (currentProgress < 5000 || videoDuration === undefined) return;
      const hasEnded = currentProgress > videoDuration - 5000;
      console.log('WHY');
      await saveProgress(currentProgress, hasEnded, videoDuration);
    } catch (e) {
      console.log('umm: ', e);
    } finally {
      // Re-enabled (rpi-api#42 review round 1): moduleResource is
      // redux-persisted (Store.ts persistConfig whitelist), and this was
      // dead code — a stale previous item's learningResource survived
      // unmount and could satisfy the media-less-completion effect's guard
      // on the NEXT item's mount, before that item's own fetch() resolved.
      // `return` above still reaches this finally block, so clear() runs on
      // every unmount, not only after a real saveProgress call.
      await clear();
    }
  };

  // Round 2 review, blocker 1: the mount effect below only re-runs when
  // `selectedModule` changes, so its cleanup closure was pinned to the
  // handleSaveProgressAndClear (and, through it, saveProgress/loaded) from
  // that ONE render — at mount time, before fetch() has resolved anything.
  // A real watched-to-end video's unmount save was silently dropped because
  // that pinned closure's `loaded` (nee `learningResource`) was still the
  // mount-time default. Keeping the latest closure in a ref, updated after
  // every render, and having the cleanup call `ref.current()` instead of
  // the closed-over function directly means the cleanup always runs with
  // whatever state was current at the moment of unmount, not at mount.
  const handleSaveProgressAndClearRef = React.useRef(handleSaveProgressAndClear);
  React.useEffect(() => {
    handleSaveProgressAndClearRef.current = handleSaveProgressAndClear;
  });

  console.log('Source is : ', source);
  React.useEffect(() => {
    // retrieveFile('sample.mp4')
    if (!selectedModule) return;
    // A mid-mount id change (selectedModule changing without a full
    // unmount/remount) starts a new fetch() for a new lessonLearningId —
    // the once-per-mount guard below must reset with it, or the new item's
    // media-less completion (or the old item's onError, if the <Video> is
    // still transitioning) could be silently skipped.
    completionPostedRef.current = false;
    fetch();

    return () => {
      handleSaveProgressAndClearRef.current();
    };
  }, [selectedModule]);

  React.useEffect(() => {
    handleResumeProgress();
  }, [learningResource, video.current]);

  React.useEffect(() => {
    // `loaded` (useLearning) only flips true after THIS lessonLearningId's
    // fetch() has written both source and learningResource — without it,
    // this effect could fire on the render where learningResource is still
    // the previous item's (or undefined) and source is the still-default
    // ''. The learningResource?.lessonlearningid === lessonLearningId check
    // is a second, belt-and-suspenders guard against the same stale-data
    // shape: moduleResource is redux-persisted, so a fresh mount can
    // rehydrate it from a previous session's item before this one's fetch()
    // has even started. See rpi-api#42 review round 1.
    if (
      !loaded ||
      source !== '' ||
      learningResource?.lessonlearningid !== lessonLearningId ||
      completionPostedRef.current
    )
      return;
    completionPostedRef.current = true;
    saveProgress(0, true, 0);
  }, [loaded, source, learningResource, lessonLearningId]);

  const handleResumeProgress = () => {
    if (
      !video.current ||
      !learningResource ||
      _.isEmpty(learningResource.studentlearningprogress) ||
      learningResource.studentlearningprogress.progress < 5000
    )
      return;
    setIsVisible(true);
  };

  const handleClose = () => {
    router.back();
  };

  const handlePlay = async () => {
    if (_.isEmpty(video.current)) return;
    const isPlaying = methods.getValues('stat.isPlaying');
    if (!isPlaying) {
      const durationMillis = methods.getValues('stat.durationMillis');
      const positionMillis = methods.getValues('stat.positionMillis');
      // At the end of the clip playAsync() is a no-op; restart from 0:00.
      if (
        typeof durationMillis === 'number' &&
        durationMillis > 0 &&
        positionMillis >= durationMillis - 250
      ) {
        await video.current.replayAsync();
      } else {
        await video.current.playAsync();
      }
      methods.setValue('stat.isPlaying', true);
    } else {
      await video.current.pauseAsync();
      methods.setValue('stat.isPlaying', false);
    }
  };

  const handleSetVolume = async (val: number) => {
    console.log(val);
    if (!video.current || !_.isNumber(val)) return;
    await video.current.setVolumeAsync(val);
    methods.setValue('stat.volume', val);
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    methods.setValue('stat', status);
  };

  const handleSeekForward = async () => {
    if (!video.current) return;
    const newPosition = Math.min(
      methods.getValues('stat.durationMillis') ?? 0,
      methods.getValues('stat.positionMillis') + 10000,
    );
    await video.current.setPositionAsync(newPosition);
  };

  const handleSeekRewind = async () => {
    if (!video.current) return;
    const newPosition = Math.max(
      0,
      methods.getValues('stat.positionMillis') - 10000,
    );
    await video.current.setPositionAsync(newPosition);
  };

  const handleSeekChange = async (val: number) => {
    console.log('VAL? ', val);
    if (!video.current || !_.isNumber(val)) return;
    await video.current.setPositionAsync(val);
    methods.setValue('stat.positionMillis', val);
  };

  const handleResumeVideo = async () => {
    console.log('cur ', !video.current);
    console.log('resource ', !learningResource);
    console.log('progress ', !learningResource?.studentlearningprogress);
    if (
      !video.current ||
      !learningResource ||
      !learningResource.studentlearningprogress
    )
      return;

    await video.current.setPositionAsync(
      learningResource.studentlearningprogress.progress,
    );

    setIsVisible(false);
  };

  const handleCloseModal = () => {
    setIsVisible(false);
  };

  const renderResumeModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        presentationStyle="overFullScreen"
        visible={isVisible}>
        <BlackVeil opacity={0.8} />
        <Expanded justifyContent="center">
          <ResumeVideoPopUp
            header={`${learningResource?.lessonlearningname}`}
            onClose={handleCloseModal}
            onResume={handleResumeVideo}
          />
        </Expanded>
      </Modal>
    );
  };

  // U-11: in corporate portrait the 16:9 box sits at the top on the page
  // background, so the tab bar reads as normal chrome rather than peeking
  // out from under a full-screen black canvas. Landscape and kids unchanged.
  const isCorporatePortrait = isCorporate && isPortrait;
  // LayoutScrollView still wraps screens in React Native's SafeAreaView,
  // which is a no-op on Android, so this top-aligned box renders under the
  // status bar and the close button lands behind it. Pad the player down by
  // the real inset. On iOS, SafeAreaView already pads, so this is excluded
  // to avoid double inset. Landscape keeps its full-window player, where the
  // inset is 0 anyway.
  const playerTopInset =
    isCorporatePortrait && Platform.OS === 'android' ? insets.top : 0;
  const canvasColor = isCorporatePortrait ? theme.colors.background : 'black';
  const canvasJustify = isCorporatePortrait
    ? 'flex-start'
    : isPortrait
    ? 'center'
    : 'flex-start';

  return (
    <LayoutScrollView
      backgroundColor={canvasColor}
      justifyContent={canvasJustify}>
      <FormProvider {...methods}>
        {/*
          key={source}: one native player per source. useLearning's source
          is '' on mount and the real URL once fetch() lands, and expo-av
          13.10 on Android loses the progress interval when a mounted
          <Video> changes source: VideoView.setSource (VideoView.java:338)
          carries the old player's getStatus() into the new one, and
          getStatus() stores progressUpdateIntervalMillis with putInt
          (PlayerData.java:443) while setStatusWithListener reads it back
          with getDouble (PlayerData.java:318-319). Bundle.getDouble on an
          Integer returns 0.0, so the interval becomes 0 and ProgressLooper
          never schedules a tick: no periodic status while playing, and the
          elapsed label and scrubber sat at 0:00 until pause or end. The
          `status` prop cannot repair it because React only re-sends it when
          its contents change. A fresh native view per source starts from
          the prop's own interval instead.
        */}
        <Video
          key={source}
          ref={video}
          style={{
            width: playerWidth,
            height: playerHeight,
            marginTop: playerTopInset,
          }}
          videoStyle={{ width: playerWidth, height: playerHeight }}
          source={{
            uri: source,
          }}
          // F-01: expo-av's native Android controls expose nothing to the
          // accessibility tree, so Android uses VideoControl's own bar
          // instead. iOS keeps the native controls (unaudited, untouched).
          useNativeControls={isNativeDevice && Platform.OS !== 'android'}
          isLooping={false}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          // Position drives the elapsed label and the scrubber's
          // accessibilityValue; at 5000 ms they moved in 5 s jumps. 1000 ms
          // matches the label's whole-second resolution. (The 0:00-for-the-
          // whole-clip bug on Android was the lost interval fixed by `key`
          // above, not this value.) Progress is saved on unmount, not per
          // update, so a faster interval does not save more often.
          progressUpdateIntervalMillis={1000}
          onError={e => {
            console.log('Video Error: ', e);
            // Load failure is the other "no playable media" signal (a
            // non-empty source that 404s/fails to decode) — same one-shot
            // completion as the empty-source effect above.
            if (!completionPostedRef.current) {
              completionPostedRef.current = true;
              saveProgress(0, true, 0);
            }
          }}
          onLoadStart={() => {
            console.log('Loading Video Start');
          }}
          onLoad={(status: AVPlaybackStatus) => {
            console.log('Loading: ', status.isLoaded);
          }}
        />
        <VideoControl
          onPlayPausePress={handlePlay}
          onVolumeChanged={handleSetVolume}
          onForwardPress={handleSeekForward}
          onRewindPress={handleSeekRewind}
          onSeekChanged={handleSeekChange}
          onClosePress={handleClose}
        />
      </FormProvider>
      {renderResumeModal()}
    </LayoutScrollView>
  );
}
