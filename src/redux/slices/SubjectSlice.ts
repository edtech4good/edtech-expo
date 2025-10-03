import { Subject } from '@/models';
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';

interface Props {
  subjects: Subject[];
  selectedSubject: Subject | undefined;
}

const name = 'subject';

const initialState: Props = {
  subjects: [],
  selectedSubject: undefined,
};

export const subjectSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateSubject: (state, action) => {
      state.subjects = action.payload;
      return state;
    },
  },
});

export const getSubjects = (state: RootState) => state.subject.subjects;

export const SubjectActions = subjectSlice.actions;
