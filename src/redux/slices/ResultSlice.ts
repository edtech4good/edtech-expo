import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';

const name = 'result';

interface Props {
  hasPassed: boolean;
  maxScore: number;
  score: number;
  percentage: number;
}

const initialState: Props = {
  hasPassed: false,
  maxScore: 0,
  score: 0,
  percentage: 0,
};

export const resultSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateResult: (state, action: { type: string; payload: Props }) => {
      const { hasPassed, maxScore, percentage, score } = action.payload;
      state.hasPassed = hasPassed;
      state.maxScore = maxScore;
      state.percentage = percentage;
      state.score = score;
      return state;
    },
    clearResult: () => initialState,
  },
});

export const getResult = (state: RootState) => state.result;
export const ResultActions = resultSlice.actions;
