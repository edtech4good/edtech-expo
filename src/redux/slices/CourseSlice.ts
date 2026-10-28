import { getSelectedLanguage } from './SettingSlice';
import { memoList, overlayCourse, overlayRows } from '@/transforms/Content';
import { Course } from '@/models';
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';

interface Props {
  courses: Course[];
  selectedCourse: Course | undefined;
}

const name = 'course';

const initialState: Props = {
  courses: [],
  selectedCourse: undefined,
};

export const courseSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateCourse: (state, action) => {
      state.courses = action.payload;
      return state;
    },
    clear: () => initialState,
  },
});

const overlayCourses = memoList<Course>(overlayCourse);
export const getCourses = (state: RootState) =>
  overlayRows(overlayCourses, state.course.courses, getSelectedLanguage(state));

export const CourseActions = courseSlice.actions;
