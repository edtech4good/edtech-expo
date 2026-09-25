import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { ProgressSummary } from '@/models';
import { clearAllData } from '../CommonAction';

interface Props {
  byStudent: Record<string, ProgressSummary>;
}

const name = 'progress';

const initialState: Props = {
  byStudent: {},
};

export const progressSlice = createSlice({
  name,
  initialState,
  reducers: {
    setProgressSummary: (state, action: PayloadAction<ProgressSummary>) => {
      (state.byStudent ??= {})[action.payload.studentId] = action.payload;
      return state;
    },
  },
  extraReducers: builder => {
    builder.addCase(clearAllData, () => initialState);
  },
});

// The persisted shape used to be { byCurriculum: Record<string, ...> }
// (per-curriculum caching, since removed along with the old dashboard). This
// slice now persists only byStudent under the same persist key; a stale
// byCurriculum key left over from an older install is simply ignored.
// redux-persist's default autoMergeLevel1 replaces the whole `progress`
// slice with whatever was persisted, so a device that persisted the old
// { byCurriculum } shape rehydrates with byStudent missing entirely, not
// just empty. Both the reducer and the selector below tolerate a missing
// byStudent defensively rather than bumping persistConfig.version / adding
// a migrate step, since that's the least invasive safe option here.
export const getProgressSummary =
  (studentId: string | undefined) => (state: RootState) =>
    studentId ? state.progress.byStudent?.[studentId] : undefined;

export const ProgressActions = progressSlice.actions;
