import { useState } from 'react';
import { useApi } from '../api/ApiContext';
import _ from 'lodash';
import { LessonPracticeResource, PracticeResult } from '@/models';

export default function usePractice(lessonLearningId: string) {
  const api = useApi();
  const [isFetching, setIsFetching] = useState(false);
  const [questions, setQuestions] = useState<LessonPracticeResource[]>([]);

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchPractice(lessonLearningId);
    console.log('RE : ', response.data?.data[0].lessonpracticeid);
    await setQuestions(
      _.sortBy(_.get(response, 'data.data', []), 'lessonpracticequestionorder'),
    );
    await setIsFetching(false);
  };

  const saveResult = async (results: PracticeResult) => {
    await api.savePracticeResult(lessonLearningId, results);
  };

  return { fetch, saveResult, questions, isFetching };
}
