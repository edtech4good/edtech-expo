import { useState } from 'react';
import { useApi } from '../api/ApiContext';
import { LessonQuizResource, QuizResult } from '@/models';
import _ from 'lodash';

export default function useQuiz(lessonQuizId: string) {
  const api = useApi();
  const [isFetching, setIsFetching] = useState(false);
  const [questions, setQuestions] = useState<LessonQuizResource[]>([]);

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchQuiz(lessonQuizId);
    await setQuestions(
      _.sortBy(_.get(response, 'data.data', []), 'lessonquizquestionorder'),
    );
    await setIsFetching(false);
  };

  const saveResult = async (results: QuizResult) => {
    await api.saveQuizResult(lessonQuizId, results);
  };

  return { fetch, saveResult, isFetching, questions };
}
