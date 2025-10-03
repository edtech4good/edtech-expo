import { useAppDispatch, useAppSelector } from '@/redux';
import { useApi } from '../api/ApiContext';
import { useState } from 'react';
import { getLesson, LessonActions, SelectionActions } from '@/redux/slices';
import { LessonLearning, LessonPractice, LessonQuiz } from '@/models';

export default function useLesson(lessonId: string) {
  const api = useApi();
  const dispatch = useAppDispatch();
  const lesson = useAppSelector(getLesson);
  const [isFetching, setIsFetching] = useState(false);

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchChapters(lessonId);
    await dispatch(LessonActions.updateLesson(response.data?.data));
    await setIsFetching(false);
  };

  const selectModule = async (
    mod: LessonLearning | LessonPractice | LessonQuiz,
  ) => {
    await dispatch(SelectionActions.selectModule(mod));
  };

  const clear = async () => {
    await dispatch(LessonActions.clear());
  };

  return { fetch, clear, selectModule, isFetching, lesson };
}
