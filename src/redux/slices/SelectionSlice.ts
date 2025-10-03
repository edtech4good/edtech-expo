import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import {
  Course,
  Lesson,
  LessonLearning,
  LessonLearningResource,
  LessonPractice,
  LessonQuiz,
  Level,
  Subject,
  Unit,
} from '@/models';
import { clearAllData } from '../CommonAction';

interface Props {
  selectedSubject: Subject | undefined;
  selectedCourse: Course | undefined;
  selectedUnit: Unit | undefined;
  selectedLevel: Level | undefined;
  selectedLesson: Lesson | undefined;
  selectedModule: LessonLearning | LessonPractice | LessonQuiz | undefined;
  moduleResource: LessonLearningResource | undefined;
}

const name = 'selection';

const initialState: Props = {
  selectedSubject: undefined,
  selectedCourse: undefined,
  selectedUnit: undefined,
  selectedLevel: undefined,
  selectedLesson: undefined,
  selectedModule: undefined,
  moduleResource: undefined,
};

export const selectionSlice = createSlice({
  name,
  initialState,
  reducers: {
    selectSubject: (state, action) => {
      state.selectedSubject = action.payload;
      return state;
    },
    selectCourse: (state, action) => {
      state.selectedCourse = action.payload;
      return state;
    },
    selectUnit: (state, action) => {
      state.selectedUnit = action.payload;
      return state;
    },
    selectLevel: (state, action) => {
      state.selectedLevel = action.payload;
      return state;
    },
    selectLesson: (state, action) => {
      state.selectedLesson = action.payload;
      return state;
    },
    selectModule: (state, action) => {
      state.selectedModule = action.payload;
      return state;
    },
    updateModuleResource: (state, action) => {
      state.moduleResource = action.payload;
      return state;
    },
    clearModuleResource: state => {
      state.moduleResource = undefined;
      return state;
    },
  },
  extraReducers: builder => {
    builder.addCase(clearAllData, () => initialState);
  },
});

export const getSelectedSubject = (state: RootState) =>
  state.selection.selectedSubject;
export const getSelectedCourse = (state: RootState) =>
  state.selection.selectedCourse;
export const getSelectedUnit = (state: RootState) =>
  state.selection.selectedUnit;
export const getSelectedLevel = (state: RootState) =>
  state.selection.selectedLevel;
export const getSelectedLesson = (state: RootState) =>
  state.selection.selectedLesson;
export const getSelectedModule = (state: RootState) =>
  state.selection.selectedModule;
export const getModuleResource = (state: RootState) =>
  state.selection.moduleResource;

export const SelectionActions = selectionSlice.actions;
