import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import {
  enqueuePendingItem,
  type PendingResultItem,
} from '@/services/pendingResultsQueue';

// Persisted (Store.ts whitelist). Adding kind 'learning' is additive: items
// persisted by older builds are all 'practice'/'quiz' and rehydrate as-is.
export type { PendingResultItem, PendingResultKind } from '@/services/pendingResultsQueue';

const name = 'pendingResult';

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
    // Learning (video progress) items coalesce per learning + owner — see
    // enqueuePendingItem / coalesceLearningProgress.
    enqueueResult: (state, action: PayloadAction<PendingResultItem>) => {
      state.items = enqueuePendingItem(state.items, action.payload);
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
