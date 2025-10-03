import { Standard } from '@/models';
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';

interface Props {
  standards: Standard[];
  selectedStandard: Standard | undefined;
}

const name = 'standard';

const initialState: Props = {
  standards: [],
  selectedStandard: undefined,
};

export const standardSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateStandards: (state, action) => {
      state.standards = action.payload;
      return state;
    },
    selectStandard: (state, action) => {
      state.selectedStandard = action.payload;
      return state;
    },
  },
});

export const getStandards = (state: RootState) => state.standard.standards;
export const getSelectedStandard = (state: RootState) =>
  state.standard.selectedStandard;

export const StandardActions = standardSlice.actions;
