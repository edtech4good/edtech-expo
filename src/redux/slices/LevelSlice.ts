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

export const getLevel = (state: RootState) => state.level;

export const LevelActions = levelSlice.actions;
