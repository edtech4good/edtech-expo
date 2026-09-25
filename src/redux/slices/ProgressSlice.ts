import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { CurriculumProgress } from '@/models';
import { clearAllData } from '../CommonAction';

interface Props {
  byCurriculum: Record<string, CurriculumProgress>;
}

const name = 'progress';

const initialState: Props = {
  byCurriculum: {},
};

export const progressSlice = createSlice({
  name,
  initialState,
  reducers: {
    setCurriculumProgress: (
      state,
      action: PayloadAction<CurriculumProgress>,
    ) => {
      state.byCurriculum[action.payload.curriculumId] = action.payload;
      return state;
    },
  },
  extraReducers: builder => {
    builder.addCase(clearAllData, () => initialState);
  },
});

export const getCurriculumProgress =
  (curriculumId: string | undefined) => (state: RootState) =>
    curriculumId ? state.progress.byCurriculum[curriculumId] : undefined;

export const ProgressActions = progressSlice.actions;
