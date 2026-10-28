import { getSelectedLanguage } from './SettingSlice';
import { memoByRef, overlayLesson, overlayOne } from '@/transforms/Content';
import { Lesson, LessonLearning, LessonPractice, LessonQuiz } from '@/models';
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';

interface Props {
  lesson: Lesson | undefined;
  selectedLearning: LessonLearning | undefined;
  selectedPractice: LessonPractice | undefined;
  selectedQuiz: LessonQuiz | undefined;
}

const name = 'lesson';

const initialState: Props = {
  lesson: undefined,
  selectedLearning: undefined,
  selectedPractice: undefined,
  selectedQuiz: undefined,
};

export const lessonSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateLesson: (state, action) => {
      state.lesson = action.payload;
      return state;
    },
    clear: () => initialState,
  },
});

const overlayLessonOnce = memoByRef<Lesson, Lesson>(overlayLesson);
export const getLesson = (state: RootState) =>
  overlayOne(overlayLessonOnce, state.lesson.lesson, getSelectedLanguage(state));

export const LessonActions = lessonSlice.actions;
