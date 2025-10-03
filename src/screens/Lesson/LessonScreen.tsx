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
import { useLearning, useSetting } from '@/services';
import { LessonLearning } from '@/models';
import ResumeVideoPopUp from './components/ResumeVideoPopUp';
import { StatusBar } from 'expo-status-bar';

export default function LessonScreen() {
  const navigation = useNavigation();
  const video = React.useRef<Video>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const controllerOpacity = React.useMemo(() => new Animated.Value(1), []);
  const videoPlayerHeight = React.useMemo(() => height, []);
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
  const { fetch, source, progress, saveProgress, learningResource, clear } =
    useLearning((selectedModule as LessonLearning)?.lessonlearningid);
  // const {retrieveFile}  = useSetting();
  const [isVisible, setIsVisible] = React.useState(false);
  const localSource = `content://com.android.externalstorage.documents/tree/primary%3Ayour-resource-path/document/primary%3Ayour-resource-path%2Fsample.mp4`;

  React.useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  console.log('Source is : ', source);
  React.useEffect(() => {
    // retrieveFile('sample.mp4')
    if (!selectedModule) return;
    fetch();

    return () => {
      handleSaveProgressAndClear();
    };
  }, [selectedModule]);

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
      // await clear();
    }
  };

  React.useEffect(() => {
    handleResumeProgress();
  }, [learningResource, video.current]);

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
      await video.current.playAsync();
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

  return (
    <LayoutScrollView backgroundColor={'black'}>
      <FormProvider {...methods}>
        <Video
          ref={video}
          style={{ width, height }}
          videoStyle={{ width, height: videoPlayerHeight }}
          source={{
            uri: source,
          }}
          useNativeControls={isNativeDevice}
          isLooping={false}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          progressUpdateIntervalMillis={5000}
          onError={e => {
            console.log('Video Error: ', e);
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
