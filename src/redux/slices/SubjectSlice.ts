import { getSelectedLanguage } from './SettingSlice';
import { memoList, overlayRows, overlaySubject } from '@/transforms/Content';
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

const overlaySubjects = memoList<Subject>(overlaySubject);
// The overlay of the interface language over the raw rows (bilingual content).
export const getSubjects = (state: RootState) =>
  overlayRows(overlaySubjects, state.subject.subjects, getSelectedLanguage(state));

export const SubjectActions = subjectSlice.actions;
