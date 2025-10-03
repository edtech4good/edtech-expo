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

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchLevels(unitId);
    await dispatch(LevelActions.updateLevel(response.data?.data as Level));
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
