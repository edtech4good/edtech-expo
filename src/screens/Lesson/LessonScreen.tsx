import * as React from 'react';
import {
  useWindowDimensions,
  Pressable,
  Animated,
  Modal,
  Platform,
  View,
} from 'react-native';
import {
  Video,
  ResizeMode,
  AVPlaybackStatus,
  AVPlaybackStatusSuccess,
} from 'expo-av';
import { audioManager } from '@/components/kit/audio/audioManager';
import { BlackVeil, Expanded, LayoutScrollView } from '@/components';
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
  setVideoFullScreen,
} from '@/services';
import { LessonLearning } from '@/models';
import ResumeVideoPopUp from './components/ResumeVideoPopUp';
import UnsupportedItemNotice from './components/UnsupportedItemNotice';
import { isLearningItemSupported } from '@/constants/LearningItems';
import { StatusBar } from 'expo-status-bar';
import {
  BAR_HEIGHT_ESTIMATE,
  fullScreenVideoBox,
} from './fullScreenLayout';
import {
  hasLoadedMedia,
  mayPostNoMediaCompletion,
} from './noMediaCompletion';
import useFullScreenCleanup from './useFullScreenCleanup';
import { planUnmountSave } from './unmountSave';

export default function LessonScreen() {
  const navigation = useNavigation();
  const video = React.useRef<Video>(null);
  const { width, height } = useWindowDimensions();
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
  // The custom bar (VideoControl) is rendered on Android and web; iOS keeps
  // its native controls, so it gets neither the inline bar nor our button.
  const hasCustomBar = Platform.OS === 'android' || Platform.OS === 'web';
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

  // Full screen (edtech-expo#143). expo-av's presentFullscreenPlayer() was
  // rejected for Android: it moves the native view into a Dialog and forces
  // expo-av's own MediaController there (FullscreenVideoPlayer.java
  // setOverridingUseNativeControls(true)), the controls the TalkBack audit
  // (F-01) found invisible to the accessibility tree, and our React bar
  // would sit behind that dialog. So full screen is our own Modal hosting
  // the same <Video> and VideoControl.
  // The <Video> is rendered in exactly one place at a time (inline, or in
  // the Modal), so there is one native player and one `video` ref. Moving it
  // remounts it, so the position and play state are carried over as the new
  // player's initial status.
  const [fullScreen, setFullScreen] = React.useState(false);
  const fullScreenRef = React.useRef(false);
  // Full-screen layout: the modal's measured size, and the bar's measured
  // height. The video takes what the bar leaves (see fullScreenLayout.ts).
  const [fsSize, setFsSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const [fsBarHeight, setFsBarHeight] = React.useState(BAR_HEIGHT_ESTIMATE);
  const [handoff, setHandoff] = React.useState<{
    source: string;
    status: { positionMillis: number; shouldPlay: boolean };
  } | null>(null);
  // True from a toggle until the remounted player reports a loaded status; an
  // unloaded status in between must not blank the elapsed label.
  const handoffPendingRef = React.useRef(false);
  // Where the remounted player must resume. Native applies the initial status'
  // positionMillis itself; expo-av on the web ignores it, so the effect below
  // seeks the new player once it is mounted.
  const handoffSeekRef = React.useRef<number | null>(null);

  const selectedModule = useAppSelector(getSelectedModule);
  const lessonLearningId = (selectedModule as LessonLearning)?.lessonlearningid;
  // An item of a type this build cannot render never reaches the player: no
  // fetch, so no source and no progress post (and so not the empty-source
  // "complete on open" path below). The lesson list does not open such an
  // item; this covers a persisted selection or a deep link.
  const unsupportedItem =
    !!selectedModule && !isLearningItemSupported(selectedModule as LessonLearning);
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
  // The learning item the resume prompt has been offered for on this mount
  // (see handleResumeProgress).
  const resumeOfferedForRef = React.useRef<string | null>(null);
  // Media-less learning items (corporate/DCRS content seeded as video items
  // whose file does not exist) earn their learning points on open rather
  // than on "watched to the end" — real videos keep the watched-to-end rule
  // below unchanged. Guards a single completion POST per mount: either
  // trigger (empty source, or the <Video> failing to load) could otherwise
  // fire more than once. See rpi-api#42.
  const completionPostedRef = React.useRef<boolean>(false);
  // True once this learning item's player has really loaded media (a duration
  // arrived). The "no playable media" completion in onError is for an item
  // that never loaded: a reload that fails after a load (the full-screen
  // switch remounts the player; a network drop then) must not mark it watched.
  const everLoadedRef = React.useRef<boolean>(false);
  // The last real duration this item's player reported. The unmount save falls
  // back to it when the stored status has none (a failed reload on the web).
  const lastGoodDurationRef = React.useRef<number | null>(null);
  const localSource = `content://com.android.externalstorage.documents/tree/primary%3Ayour-resource-path/document/primary%3Ayour-resource-path%2Fsample.mp4`;

  React.useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const handleSaveProgressAndClear = async () => {
    try {
      const plan = planUnmountSave({
        positionMillis: methods.getValues('stat.positionMillis'),
        durationMillis: methods.getValues('stat.durationMillis'),
        lastGoodDuration: lastGoodDurationRef.current,
      });
      if (!plan) return;
      console.log('WHY');
      await saveProgress(plan.progress, plan.hasEnded, plan.duration);
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
    if (!selectedModule || unsupportedItem) return;
    // A mid-mount id change (selectedModule changing without a full
    // unmount/remount) starts a new fetch() for a new lessonLearningId —
    // the once-per-mount guard below must reset with it, or the new item's
    // media-less completion (or the old item's onError, if the <Video> is
    // still transitioning) could be silently skipped.
    completionPostedRef.current = false;
    everLoadedRef.current = false;
    lastGoodDurationRef.current = null;
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
    // Offer the prompt once per learning item. The effect above refires
    // whenever video.current changes, and key={source} on the <Video>
    // changes it once per open: learningResource lands (redux, its own
    // render) while source is still '', the prompt shows against that
    // player, then source lands and the key mounts a new one. The effect
    // only sees the new ref on the next render, which is the one the
    // learner's No/Yes causes, so without this guard the prompt reopened
    // after every first tap (web, 15 of 15 opens).
    if (resumeOfferedForRef.current === learningResource.lessonlearningid)
      return;
    resumeOfferedForRef.current = learningResource.lessonlearningid;
    setIsVisible(true);
  };

  const handleClose = () => {
    router.back();
  };

  const browserFullScreenElement = () =>
    typeof document !== 'undefined' ? document.fullscreenElement : null;

  const setFullScreenOpen = async (next: boolean) => {
    if (fullScreenRef.current === next) return;
    // Claim the state synchronously so a second toggle (Escape fires both
    // keydown and fullscreenchange) is a no-op.
    fullScreenRef.current = next;
    // The orientation policy lets a phone turn to landscape while this is
    // set, and locks it back to portrait when it clears.
    setVideoFullScreen(next);
    // Must run inside the press that started it, before any await.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (next) {
        document.documentElement.requestFullscreen?.().catch(() => undefined);
      } else if (browserFullScreenElement()) {
        document.exitFullscreen?.().catch(() => undefined);
      }
    }
    // The form's status only updates once a second; ask the player for its
    // exact position so the remounted one resumes where this one is.
    let stat = methods.getValues('stat') as Partial<AVPlaybackStatusSuccess>;
    try {
      const live = await video.current?.getStatusAsync();
      if (live) stat = live as Partial<AVPlaybackStatusSuccess>;
    } catch {
      // keep the last reported status
    }
    if (fullScreenRef.current !== next) return; // toggled again meanwhile
    // Re-entering in the other orientation must not lay out one frame at the
    // size measured last time.
    if (!next) setFsSize(null);
    if (stat.isLoaded) {
      handoffPendingRef.current = true;
      handoffSeekRef.current = stat.positionMillis ?? 0;
      setHandoff({
        source,
        status: {
          positionMillis: stat.positionMillis ?? 0,
          shouldPlay: !!stat.isPlaying,
        },
      });
    }
    setFullScreen(next);
  };

  React.useEffect(() => {
    const target = handoffSeekRef.current;
    handoffSeekRef.current = null;
    if (target === null || Platform.OS !== 'web') return;
    // A <video> keeps a currentTime set before its data has loaded.
    video.current?.setPositionAsync(target).catch(() => undefined);
  }, [fullScreen]);

  const handleToggleFullScreen = () => {
    void setFullScreenOpen(!fullScreenRef.current);
  };
  // The web listeners below are registered once; they call the latest closure.
  const setFullScreenOpenRef = React.useRef(setFullScreenOpen);
  React.useEffect(() => {
    setFullScreenOpenRef.current = setFullScreenOpen;
  });

  // Leaving the lesson while full screen gives the portrait lock back.
  useFullScreenCleanup(() => {
    fullScreenRef.current = false;
  });

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // Escape leaves the browser's full screen (fullscreenchange), and leaves
    // our modal when the browser would not go full screen at all (keydown).
    const onFullScreenChange = () => {
      if (!document.fullscreenElement && fullScreenRef.current)
        void setFullScreenOpenRef.current(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullScreenRef.current)
        void setFullScreenOpenRef.current(false);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

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
    // A remounted player (full screen in or out) reports "not loaded" first,
    // and on the web "loaded" with no duration before any data. Until real
    // media has loaded, keep the last good status so the label, the scrubber
    // and the unmount save do not see a NaN duration or a zero position.
    if (handoffPendingRef.current && !hasLoadedMedia(status)) return;
    if (hasLoadedMedia(status)) {
      handoffPendingRef.current = false;
      everLoadedRef.current = true;
      lastGoodDurationRef.current = status.durationMillis as number;
    }
    // One sound at a time: when the video starts playing (our controls, the
    // native iOS ones, or autoplay), stop any question or option audio still
    // playing on the shared player.
    const wasPlaying = methods.getValues('stat.isPlaying');
    if (status.isLoaded && status.isPlaying && !wasPlaying)
      void audioManager.stop();
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

  // Corporate portrait keeps the page background (U-11: the tab bar reads as
  // normal chrome, not as something peeking out from under a black canvas).
  // The video and its bar are one block, centred vertically on the screen like
  // the kids layout, not top-aligned (Jesse, 30 Oct 2026, edtech-expo#143).
  // Centred, the block never reaches the status bar, so the old Android top
  // inset on the player is gone. Landscape keeps its full-window player.
  const isCorporatePortrait = isCorporate && isPortrait;
  const canvasColor = isCorporatePortrait ? theme.colors.background : 'black';
  const canvasJustify = isPortrait ? 'center' : 'flex-start';

  if (unsupportedItem) {
    return (
      <LayoutScrollView backgroundColor={theme.colors.background}>
        <UnsupportedItemNotice
          name={(selectedModule as LessonLearning).lessonlearningname}
          onClose={handleClose}
        />
      </LayoutScrollView>
    );
  }

  // key={source}: one native player per source. useLearning's source
  // is '' on mount and the real URL once fetch() lands, and expo-av
  // 13.10 on Android loses the progress interval when a mounted
  // <Video> changes source: VideoView.setSource (VideoView.java:338)
  // carries the old player's getStatus() into the new one, and
  // getStatus() stores progressUpdateIntervalMillis with putInt
  // (PlayerData.java:443) while setStatusWithListener reads it back
  // with getDouble (PlayerData.java:318-319). Bundle.getDouble on an
  // Integer returns 0.0, so the interval becomes 0 and ProgressLooper
  // never schedules a tick: no periodic status while playing, and the
  // elapsed label and scrubber sat at 0:00 until pause or end. The
  // `status` prop cannot repair it because React only re-sends it when
  // its contents change. A fresh native view per source starts from
  // the prop's own interval instead.
  const renderVideo = (box: {
    width: number;
    height: number;
    marginTop: number;
  }) => (
    <Video
      key={source}
      ref={video}
      style={{
        width: box.width,
        height: box.height,
        marginTop: box.marginTop,
      }}
      videoStyle={{ width: box.width, height: box.height }}
      status={handoff && handoff.source === source ? handoff.status : undefined}
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
        if (
          mayPostNoMediaCompletion({
            everLoaded: everLoadedRef.current,
            alreadyPosted: completionPostedRef.current,
          })
        ) {
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
  );

  // Portrait on a phone: the bar stacks directly under the video instead of
  // floating at the foot of the screen. Landscape (tablets) keeps the overlay.
  const barInline = hasCustomBar && isPortrait;
  // In the full-screen modal there is no offline banner and no status-bar
  // inset to clear. The video takes the room the compact bar leaves under it:
  // full width at 16:9 in portrait, the whole remaining height in landscape.
  const fullScreenBox = {
    ...fullScreenVideoBox(fsSize ?? { width, height }, fsBarHeight),
    marginTop: 0,
  };

  return (
    <LayoutScrollView
      backgroundColor={canvasColor}
      justifyContent={canvasJustify}>
      {!fullScreen && (
        <FormProvider {...methods}>
          {renderVideo({
            width: playerWidth,
            height: playerHeight,
            marginTop: 0,
          })}
          <VideoControl
            placement={barInline ? 'inline' : 'overlay'}
            onPlayPausePress={handlePlay}
            onVolumeChanged={handleSetVolume}
            onForwardPress={handleSeekForward}
            onRewindPress={handleSeekRewind}
            onSeekChanged={handleSeekChange}
            onClosePress={handleClose}
            onFullScreenPress={hasCustomBar ? handleToggleFullScreen : undefined}
          />
        </FormProvider>
      )}
      {fullScreen && (
        <Modal
          animationType="fade"
          presentationStyle="fullScreen"
          statusBarTranslucent
          supportedOrientations={['portrait', 'landscape']}
          onRequestClose={handleToggleFullScreen}
          visible>
          <StatusBar hidden />
          <View
            onLayout={e =>
              setFsSize({
                width: Math.round(e.nativeEvent.layout.width),
                height: Math.round(e.nativeEvent.layout.height),
              })
            }
            style={{
              flex: 1,
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <FormProvider {...methods}>
              {renderVideo(fullScreenBox)}
              <VideoControl
                placement="fullscreen"
                onBarLayout={setFsBarHeight}
                isFullScreen
                onPlayPausePress={handlePlay}
                onVolumeChanged={handleSetVolume}
                onForwardPress={handleSeekForward}
                onRewindPress={handleSeekRewind}
                onSeekChanged={handleSeekChange}
                onClosePress={handleClose}
                onFullScreenPress={handleToggleFullScreen}
              />
            </FormProvider>
          </View>
        </Modal>
      )}
      {renderResumeModal()}
    </LayoutScrollView>
  );
}
