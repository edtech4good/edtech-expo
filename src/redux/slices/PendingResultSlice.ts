import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { PracticeResult, QuizResult } from '@/models/Practice';

const name = 'pendingResult';

export interface PendingResultItem {
  id: string;
  kind: 'practice' | 'quiz';
  lessonId: string;
  payload: PracticeResult | QuizResult;
  queuedAt: number;
  attempts: number;
  ownerId: string | null;
}

interface PendingResultState {
  items: PendingResultItem[];
}

const initialState: PendingResultState = {
  items: [],
};

export const pendingResultSlice = createSlice({
  name,
  initialState,
  reducers: {
    enqueueResult: (state, action: PayloadAction<PendingResultItem>) => {
      state.items.push(action.payload);
    },
    dequeueResult: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    bumpAttempts: (state, action: PayloadAction<string>) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item) {
        item.attempts += 1;
      }
    },
  },
});

export const getPendingResults = (state: RootState) => state.pendingResult.items;
export const PendingResultActions = pendingResultSlice.actions;
