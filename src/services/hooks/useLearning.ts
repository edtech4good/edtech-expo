import { useState } from 'react';
import { useApi } from '../api/ApiContext';
import _ from 'lodash';
import { VideoProgressPayload } from '@/models';
import { createTimeStamp } from '@/utils';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  ActivityProgressActions,
  getModuleResource,
  getProfile,
  getResourcePath,
  SelectionActions,
} from '@/redux/slices';
import useSetting from './useSetting';
import useResource from './useResource';

export default function useLearning(lessonLearningId: string) {
  const dispatch = useAppDispatch();
  const api = useApi();
  const { retrieveFile } = useSetting();
  const grantedDirectory = useAppSelector(getResourcePath);
  const userId = useAppSelector(getProfile)?.schooluserid ?? null;
  // const [source, setSource] = useState('');
  const [{ progress, source }, setInfo] = useState<{
    source: string;
    progress: number;
  }>({
    progress: 0,
    source: '',
  });

  const videoSource = useResource({ name: source }, [source]);

  const learningResource = useAppSelector(getModuleResource);
  // False while a fetch() is in flight (and before the first one), true once
  // this lessonLearningId's source/progress have actually landed in state.
  // LessonScreen's media-less-completion effect gates on this so it cannot
  // fire against the still-default source='' before the real response comes
  // back — see rpi-api#42 review round 1.
  const [loaded, setLoaded] = useState(false);

  const fetch = async () => {
    setLoaded(false);
    // await retrieveFile('sample.mp4')
    const response = await api.fetchVideoPath(lessonLearningId);
    if (!_.isEmpty(response.data)) {
      // let source: string = '';
      // if (
      //   Platform.OS === 'web' ||
      //   process.env.EXPO_PUBLIC_ACCESS_TYPE === 'online'
      // )
      //   // Combine url to online resource
      //   source = `${process.env.EXPO_PUBLIC_RESOURCE_URL}/${_.get(
      //     response,
      //     'data.data.lessonlearningfileobject.filename',
      //   )}`;
      // else {
      //   // Get url to offline URI
      //   // source = await retrieveFile(
      //   //   _.get(response, 'data.data.lessonlearningfileobject.filename') ?? '',
      //   //   // 'hi'
      //   // );
      //   source = `${grantedDirectory}${_.get(
      //     response,
      //     'data.data.lessonlearningfileobject.filename',
      //   )}`;
      //   console.log('Source: ', source);
      // }

      // const source = useResource(
      //   {
      //     name: _.get(
      //       response,
      //       'data.data.lessonlearningfileobject.filename',
      //       '',
      //     ),
      //   },
      //   [response],
      // );

      // console.log('MY SOURCE : ', source);

      const progress = _.get(
        response,
        'data.data.studentlearningprogress.progress',
        0,
      );

      const lessonInfo = _.get(response, 'data.data');
      // Source lands in state BEFORE learningResource is dispatched, and
      // `loaded` flips to true only after both — otherwise a render could
      // observe the new learningResource against the still-empty-string
      // default source, which is exactly the "empty source" trigger the
      // media-less-completion effect watches for.
      await setInfo({
        source: _.get(
          response,
          'data.data.lessonlearningfileobject.filename',
          '',
        ),
        progress,
      });
      dispatch(SelectionActions.updateModuleResource(lessonInfo));
      setLoaded(true);
    }
  };

  const saveProgress = async (
    progress: number,
    hasEnded: boolean,
    contentLength: number,
  ) => {
    // Gated on `loaded`, not `learningResource` (round 2 review): a caller
    // that only holds a stale, closed-over reference to this function (e.g.
    // an unmount cleanup captured at mount) would otherwise always see the
    // mount-time `learningResource` — undefined, now that a previous
    // screen's clear() actually runs — and silently drop the save. `loaded`
    // means THIS hook instance's fetch() for lessonLearningId has already
    // completed, which is the real precondition for having anything to
    // save; lessonLearningId itself (not learningResource) is what the
    // request below is built from either way.
    if (!loaded) return;

    // Optimistic local status write — done before/independent of the network
    // call so it works offline. Mirrors the server rule: `ended` marks the
    // activity done, otherwise any watch time (time > 0) marks it in
    // progress. progress is only meaningful when we know content_length.
    // Unlike practice/quiz results, video progress is NOT queued for retry
    // when offline — if the saveVideoProgress call below fails, this local
    // mark is all that survives; the server never records it.
    if (userId) {
      dispatch(
        ActivityProgressActions.markLocal({
          userId,
          activityId: lessonLearningId,
          status: hasEnded ? 'done' : progress > 0 ? 'inProgress' : 'todo',
          progress:
            contentLength > 0
              ? Math.round((progress * 100) / contentLength)
              : undefined,
        }),
      );
    }

    const videoProgressPayload: VideoProgressPayload = {
      content_length: contentLength,
      date: createTimeStamp(),
      ended: hasEnded,
      time: progress,
    };
    await api.saveVideoProgress(lessonLearningId, videoProgressPayload);
  };

  const clear = async () => {
    await dispatch(SelectionActions.clearModuleResource());
  };

  return {
    fetch,
    source: videoSource,
    progress,
    learningResource,
    loaded,
    saveProgress,
    clear,
  };
}
