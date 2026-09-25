import { PASS_PERCENTAGE } from '@/constants';
import { QuizQuestionResult } from '@/models';
import { useAppDispatch, useAppSelector } from '@/redux';
import { getResult, ResultActions } from '@/redux/slices';
import _ from 'lodash';

export default function useResult() {
  const dispatch = useAppDispatch();
  const result = useAppSelector(getResult);

  const calculateResult = async (answers: QuizQuestionResult[]) => {
    const { score, maxScore } = _.reduce(
      answers,
      (result, value) => {
        if (value.iscorrect) result.score += 1;
        return result;
      },
      {
        score: 0,
        maxScore: answers.length,
      },
    );

    const percentage = maxScore ? (score * 100) / maxScore : 0;
    const hasPassed = percentage >= PASS_PERCENTAGE;

    await dispatch(
      ResultActions.updateResult({ hasPassed, maxScore, percentage, score }),
    );
  };

  const clearResult = async () => {
    await dispatch(ResultActions.clearResult());
  };

  return { calculateResult, clearResult, result };
}
