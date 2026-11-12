import { useMemo, useState } from 'react';
import { useApi } from '../api/ApiContext';
import _ from 'lodash';
import { LessonPracticeResource, PracticeResult } from '@/models';
import { submitResult } from '../pendingResults';
import { refreshAwardsAfterResult } from '../awards';
import { saveResultThenAwards } from '../awardsFlow';
import useDesign from './useDesign';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { overlayQuestionRows } from '@/transforms/Content';

export default function usePractice(lessonLearningId: string) {
  const api = useApi();
  const { isCorporate } = useDesign();
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

  // The save is exactly the pre-awards one (enqueue, then flush). Corporate
  // only, and only once the server has accepted it, awards are looked for in
  // the background; that check is never awaited here (awardsFlow).
  const saveResult = (results: PracticeResult) =>
    saveResultThenAwards({
      submit: () =>
        submitResult(api, {
          kind: 'practice',
          lessonId: lessonLearningId,
          payload: results,
        }),
      enabled: isCorporate,
      startMs: results.starttime,
      afterSynced: startMs => refreshAwardsAfterResult(api, startMs),
    });

  return { fetch, saveResult, questions, isFetching };
}
