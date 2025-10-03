import { Unit } from '@/models';
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import _ from 'lodash';

interface Props {
  units: Unit[];
  selectedUnit: Unit | undefined;
}

const name = 'unit';

const initialState: Props = {
  units: [],
  selectedUnit: undefined,
};

export const unitSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateUnit: (state, action) => {
      state.units = _.sortBy(_.get(action, 'payload', []), 'levelorder');
      return state;
    },
    clear: () => initialState,
  },
});

export const getUnits = (state: RootState) => state.unit.units;

export const UnitActions = unitSlice.actions;
