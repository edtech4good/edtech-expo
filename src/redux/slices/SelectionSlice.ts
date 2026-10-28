import { getSelectedLanguage } from './SettingSlice';
import {
  memoByRef,
  overlayCourse,
  overlayLearning,
  overlayLesson,
  overlayModule,
  overlayOne,
  overlaySubject,
  overlayUnit,
} from '@/transforms/Content';
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

// A selection holds the row exactly as the screen dispatched it; the text a
// screen reads is the overlay of the interface language over it (bilingual
// content), so a stored selection follows a language switch.
const overlaySubjectOnce = memoByRef<Subject, Subject>(overlaySubject);
const overlayCourseOnce = memoByRef<Course, Course>(overlayCourse);
const overlayUnitOnce = memoByRef<Unit, Unit>(overlayUnit);
const overlayLessonOnce = memoByRef<Lesson, Lesson>(overlayLesson);
const overlayModuleOnce = memoByRef<LessonLearning | LessonPractice | LessonQuiz, LessonLearning | LessonPractice | LessonQuiz>(overlayModule);
const overlayLearningOnce = memoByRef<LessonLearningResource, LessonLearningResource>(overlayLearning);

export const getSelectedSubject = (state: RootState) =>
  overlayOne(overlaySubjectOnce, state.selection.selectedSubject, getSelectedLanguage(state));
export const getSelectedCourse = (state: RootState) =>
  overlayOne(overlayCourseOnce, state.selection.selectedCourse, getSelectedLanguage(state));
export const getSelectedUnit = (state: RootState) =>
  overlayOne(overlayUnitOnce, state.selection.selectedUnit, getSelectedLanguage(state));
export const getSelectedLevel = (state: RootState) =>
  state.selection.selectedLevel;
export const getSelectedLesson = (state: RootState) =>
  overlayOne(overlayLessonOnce, state.selection.selectedLesson, getSelectedLanguage(state));
export const getSelectedModule = (state: RootState) =>
  overlayOne(overlayModuleOnce, state.selection.selectedModule, getSelectedLanguage(state));
export const getModuleResource = (state: RootState) =>
  overlayOne(overlayLearningOnce, state.selection.moduleResource, getSelectedLanguage(state));

export const SelectionActions = selectionSlice.actions;
