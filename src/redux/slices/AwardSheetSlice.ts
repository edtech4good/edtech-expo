import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearAllData } from '../CommonAction';
import { AwardsActions } from './AwardsSlice';

/**
 * The queue behind the "Award earned" sheet. In memory ONLY: this slice is not
 * in the persist whitelist (persistWhitelist.ts), so a restart forgets it. An
 * entry that cannot show now is dropped, never shown later over an unrelated
 * result: each one expires (`expiresAt`), the queue belongs to one learner and
 * is cleared on logout (clearAllData) and when the learner changes, and an
 * award that is seen elsewhere (detail opened) leaves it.
 */
export interface AwardSheetEntry {
  awardId: string;
  /** epoch ms after which the sheet no longer shows */
  expiresAt: number;
}

export interface AwardSheetState {
  studentId: string | null;
  queue: AwardSheetEntry[];
}

const name = 'awardSheet';

const initialState: AwardSheetState = { studentId: null, queue: [] };

export const awardSheetSlice = createSlice({
  name,
  initialState,
  reducers: {
    queueAwardSheet: (
      state,
      action: PayloadAction<{ studentId: string; entries: AwardSheetEntry[] }>,
    ) => {
      // Another learner's queue is never carried over.
      if (state.studentId !== action.payload.studentId) {
        state.studentId = action.payload.studentId;
        state.queue = [];
      }
      action.payload.entries.forEach(entry => {
        if (!state.queue.some(q => q.awardId === entry.awardId)) {
          state.queue.push(entry);
        }
      });
    },
    dropAwardSheet: (state, action: PayloadAction<{ ids: string[] }>) => {
      state.queue = state.queue.filter(
        q => !action.payload.ids.includes(q.awardId),
      );
    },
    dropExpiredAwardSheet: (state, action: PayloadAction<{ now: number }>) => {
      state.queue = state.queue.filter(q => q.expiresAt > action.payload.now);
    },
    clearAwardSheet: () => initialState,
  },
  extraReducers: builder => {
    builder.addCase(clearAllData, () => initialState);
    // Seen (sheet closed, detail opened): off the queue.
    builder.addCase(AwardsActions.markAwardsSeen, (state, action) => {
      state.queue = state.queue.filter(
        q => !action.payload.ids.includes(q.awardId),
      );
    });
  },
});

/** The award ids waiting for this learner that have not expired, oldest first. */
export function liveAwardSheetIds(
  state: AwardSheetState | undefined,
  studentId: string | undefined,
  now: number,
): string[] {
  if (!state || !studentId || state.studentId !== studentId) return [];
  return state.queue.filter(q => q.expiresAt > now).map(q => q.awardId);
}

export const getAwardSheet = (state: {
  awardSheet?: AwardSheetState;
}): AwardSheetState | undefined => state.awardSheet;

export const AwardSheetActions = awardSheetSlice.actions;
