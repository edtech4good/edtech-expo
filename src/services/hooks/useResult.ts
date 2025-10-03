import { QuizQuestionResult } from '@/models';
import { useAppDispatch, useAppSelector } from '@/redux';
import { getResult, ResultActions } from '@/redux/slices';
import _ from 'lodash';
import numeral from 'numeral';

export default function useResult() {
  const dispatch = useAppDispatch();
  const result = useAppSelector(getResult);

  const calculateResult = async (answers: QuizQuestionResult[]) => {
    const { hasPassed, maxScore, score } = _.reduce(
      answers,
      (result, value) => {
        if (value.iscorrect) {
          if (result.score + 1 >= result.maxScore / 2) result.hasPassed = true;
          result.score += 1;
        }
        return result;
      },
      {
        hasPassed: false,
        score: 0,
        maxScore: answers.length,
      },
    );

    const percentage =
      numeral(score).multiply(100).divide(maxScore).value() || 0;

    await dispatch(
      ResultActions.updateResult({ hasPassed, maxScore, percentage, score }),
    );
  };

  const clearResult = async () => {
    await dispatch(ResultActions.clearResult());
  };

  return { calculateResult, clearResult, result };
}
