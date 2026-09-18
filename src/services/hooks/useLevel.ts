import { useAppDispatch, useAppSelector } from '@/redux';
import { useApi } from '../api/ApiContext';
import { useState } from 'react';
import { getLevel, LevelActions, SelectionActions } from '@/redux/slices';
import { Lesson, Level } from '@/models';
import _ from 'lodash';

export default function useLevel(unitId: string) {
  const api = useApi();
  const dispatch = useAppDispatch();
  const { level, lessons } = useAppSelector(getLevel);
  const [isFetching, setIsFetching] = useState(false);

  const fetch = async (isActive: () => boolean = () => true) => {
    await setIsFetching(true);
    const response = await api.fetchLevels(unitId);
    // A network failure (e.g. offline, returning from a lesson) gives
    // apisauce `ok: false` and `data: undefined` — bail out before dispatch
    // so `updateLevel` never throws on `undefined`, and leave the on-screen
    // list as it was rather than blanking it.
    if (!response.ok || !response.data?.data) {
      setIsFetching(false);
      return;
    }
    // A slow response can land after the screen lost focus (`clear()` ran)
    // or after the user opened a different level — guard against
    // repopulating the slice with a stale level's lessons.
    if (!isActive()) {
      setIsFetching(false);
      return;
    }
    await dispatch(LevelActions.updateLevel(response.data.data as Level));
    await setIsFetching(false);
  };

  const selectLesson = async (lesson: Lesson) => {
    await dispatch(SelectionActions.selectLesson(lesson));
  };

  const clear = async () => {
    await dispatch(LevelActions.clear());
  };

  return {
    fetch,
    clear,
    selectLesson,
    isFetching,
    level,
    lessons: _.sortBy(lessons, 'lessonorder'),
  };
}
