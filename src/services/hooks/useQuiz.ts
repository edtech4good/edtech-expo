import { useMemo, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { LessonQuizResource, QuizResult } from '@/models';
import _ from 'lodash';
import { submitResult } from '../pendingResults';
import { refreshAwardsAfterResult } from '../awards';
import { saveResultThenAwards } from '../awardsFlow';
import useDesign from './useDesign';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { overlayQuestionRows } from '@/transforms/Content';

export default function useQuiz(lessonQuizId: string) {
  const api = useApi();
  const { isCorporate } = useDesign();
  const [isFetching, setIsFetching] = useState(false);
  const language = useAppSelector(getSelectedLanguage);
  // Raw rows (translations included); the screens read the overlay of the
  // interface language over them, so a language switch needs no refetch.
  const [rawQuestions, setQuestions] = useState<LessonQuizResource[]>([]);
  const questions = useMemo(
    () => overlayQuestionRows(rawQuestions, language),
    [rawQuestions, language],
  );

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchQuiz(lessonQuizId);
    await setQuestions(
      _.sortBy(_.get(response, 'data.data', []), 'lessonquizquestionorder'),
    );
    await setIsFetching(false);
  };

  // The save is exactly the pre-awards one (enqueue, then flush). Corporate
  // only, and only once the server has accepted it, awards are looked for in
  // the background; that check is never awaited here (awardsFlow).
  const saveResult = (results: QuizResult) =>
    saveResultThenAwards({
      submit: () =>
        submitResult(api, {
          kind: 'quiz',
          lessonId: lessonQuizId,
          payload: results,
        }),
      enabled: isCorporate,
      startMs: results.starttime,
      afterSynced: startMs => refreshAwardsAfterResult(api, startMs),
    });

  return { fetch, saveResult, isFetching, questions };
}
