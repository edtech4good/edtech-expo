import { useState } from 'react';
import { useApi } from '../api/ApiContext';
import _ from 'lodash';
import { VideoProgressPayload } from '@/models';
import { createTimeStamp } from '@/utils';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  getModuleResource,
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

  const fetch = async () => {
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
      dispatch(SelectionActions.updateModuleResource(lessonInfo));
      await setInfo({
        source: _.get(
          response,
          'data.data.lessonlearningfileobject.filename',
          '',
        ),
        progress,
      });
    }
  };

  const saveProgress = async (
    progress: number,
    hasEnded: boolean,
    contentLength: number,
  ) => {
    console.log('res', learningResource);
    if (!learningResource) return;
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
    saveProgress,
    clear,
  };
}
