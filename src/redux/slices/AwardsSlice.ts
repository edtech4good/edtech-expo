import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { AwardsOverview } from '@/models';
import { clearAllData } from '../CommonAction';
import { markSeen } from '@/screens/MyProgress/awards/awardsLogic';

export interface StudentAwardsState {
  overview?: AwardsOverview;
  /** null until the first successful fetch (then every award found is "seen"). */
  seenAwardIds: string[] | null;
  /** Awards whose "Award earned" sheet is waiting to be shown (oldest first). */
  sheetAwardIds: string[];
}

interface Props {
  byStudent: Record<string, StudentAwardsState>;
}

const name = 'awards';

const initialState: Props = { byStudent: {} };

const entry = (state: Props, studentId: string): StudentAwardsState => {
  state.byStudent ??= {};
  return (state.byStudent[studentId] ??= {
    seenAwardIds: null,
    sheetAwardIds: [],
  });
};

// Persisted (Store.ts whitelist) so My progress shows the last-known awards
// offline and "seen" survives a restart.
export const awardsSlice = createSlice({
  name,
  initialState,
  reducers: {
    setAwardsOverview: (
      state,
      action: PayloadAction<{
        overview: AwardsOverview;
        seenAwardIds: string[];
        sheetAwardIds: string[];
      }>,
    ) => {
      const e = entry(state, action.payload.overview.studentId);
      e.overview = action.payload.overview;
      e.seenAwardIds = action.payload.seenAwardIds;
      e.sheetAwardIds = action.payload.sheetAwardIds;
    },
    markAwardsSeen: (
      state,
      action: PayloadAction<{ studentId: string; ids: string[] }>,
    ) => {
      const e = entry(state, action.payload.studentId);
      e.seenAwardIds = markSeen(e.seenAwardIds, action.payload.ids);
      e.sheetAwardIds = e.sheetAwardIds.filter(
        id => !action.payload.ids.includes(id),
      );
    },
    clearAwardsSheet: (state, action: PayloadAction<{ studentId: string }>) => {
      entry(state, action.payload.studentId).sheetAwardIds = [];
    },
  },
  extraReducers: builder => {
    builder.addCase(clearAllData, () => initialState);
  },
});

// A rehydrated device from before this slice has no `awards` key at all;
// redux-persist then keeps the reducer's initial state, so byStudent is
// present, but selectors stay defensive like the progress slice's.
export const getStudentAwards =
  (studentId: string | undefined) =>
  (state: RootState): StudentAwardsState | undefined =>
    studentId ? state.awards?.byStudent?.[studentId] : undefined;

export const AwardsActions = awardsSlice.actions;
