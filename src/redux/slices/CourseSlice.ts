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

export const getCourses = (state: RootState) => state.course.courses;

export const CourseActions = courseSlice.actions;
