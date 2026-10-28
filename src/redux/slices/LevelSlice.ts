import { getSelectedLanguage } from './SettingSlice';
import {
  memoByRef,
  memoList,
  overlayLesson,
  overlayOne,
  overlayRows,
  overlayUnit,
} from '@/transforms/Content';
import { Lesson, Level, LevelDescription } from '@/models';
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';

interface Props {
  lessons: Lesson[];
  level: LevelDescription | undefined;
  hasQuiz: boolean;
  selectedLesson: Lesson | undefined;
}

const name = 'level';

const initialState: Props = {
  lessons: [],
  level: undefined,
  hasQuiz: false,
  selectedLesson: undefined,
};

export const levelSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateLevel: (state, action: { type: string; payload: Level }) => {
      const { lesson, level, level_has_quiz } = action.payload;
      state.hasQuiz = level_has_quiz;
      state.lessons = lesson;
      state.level = level;
      return state;
    },
    clear: () => initialState,
  },
});

const overlayLessons = memoList<Lesson>(overlayLesson);
const overlayLevelState = memoByRef((level: RootState['level'], language: string) => ({
  ...level,
  lessons: overlayRows(overlayLessons, level.lessons, language),
  level: overlayOne(overlayUnit, level.level, language),
  selectedLesson: overlayOne(overlayLesson, level.selectedLesson, language),
}));
export const getLevel = (state: RootState) =>
  overlayLevelState(state.level, getSelectedLanguage(state));

export const LevelActions = levelSlice.actions;
