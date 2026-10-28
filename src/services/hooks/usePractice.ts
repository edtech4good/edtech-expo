import { useMemo, useState } from 'react';
import { useApi } from '../api/ApiContext';
import _ from 'lodash';
import { LessonPracticeResource, PracticeResult } from '@/models';
import { submitResult } from '../pendingResults';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { overlayQuestionRows } from '@/transforms/Content';

export default function usePractice(lessonLearningId: string) {
  const api = useApi();
  const [isFetching, setIsFetching] = useState(false);
  const language = useAppSelector(getSelectedLanguage);
  // Raw rows (translations included); the screens read the overlay of the
  // interface language over them, so a language switch needs no refetch.
  const [rawQuestions, setQuestions] = useState<LessonPracticeResource[]>([]);
  const questions = useMemo(
    () => overlayQuestionRows(rawQuestions, language),
    [rawQuestions, language],
  );

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchPractice(lessonLearningId);
    console.log('RE : ', response.data?.data[0].lessonpracticeid);
    await setQuestions(
      _.sortBy(_.get(response, 'data.data', []), 'lessonpracticequestionorder'),
    );
    await setIsFetching(false);
  };

  const saveResult = async (results: PracticeResult) =>
    submitResult(api, {
      kind: 'practice',
      lessonId: lessonLearningId,
      payload: results,
    });

  return { fetch, saveResult, questions, isFetching };
}
