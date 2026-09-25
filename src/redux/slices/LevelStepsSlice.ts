import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { LevelSteps } from '@/models';

const name = 'levelSteps';

// Structure-only cache (mirrors LessonCacheSlice): which lessonlearningid /
// lessonpracticeid / lessonquizid belong to each lesson in a level, plus
// lessonorder — never per-user status/progress, so nothing here needs to be
// scoped to whoever is logged in. Item statuses instead live in the
// existing activityProgress slice (see mergeServerLevel), so the same store
// answers both "what activities does this lesson have" (from here, works
// offline once fetched once) and "what's their status" (from there,
// including offline/local completions).
const MAX_CACHED_LEVELS = 50;

export interface LevelStepsLessonStructure {
  lessonorder: number;
  learningIds: string[];
  practiceIds: string[];
  quizIds: string[];
}

export interface LevelStepsStructure {
  levelid: string;
  pass_percentage: number;
  lessons: Record<string, LevelStepsLessonStructure>;
}

interface LevelStepsState {
  byId: Record<string, LevelStepsStructure>;
  order: string[];
}

const initialState: LevelStepsState = {
  byId: {},
  order: [],
};

function toStructure(payload: LevelSteps): LevelStepsStructure {
  const lessons: Record<string, LevelStepsLessonStructure> = {};
  payload.lessons?.forEach(lesson => {
    lessons[lesson.lessonid] = {
      lessonorder: lesson.lessonorder,
      learningIds: (lesson.learnings ?? []).map(l => l.lessonlearningid),
      practiceIds: (lesson.practices ?? []).map(p => p.lessonpracticeid),
      quizIds: (lesson.quizzes ?? []).map(q => q.lessonquizid),
    };
  });
  return {
    levelid: payload.levelid,
    pass_percentage: payload.pass_percentage,
    lessons,
  };
}

export const levelStepsSlice = createSlice({
  name,
  initialState,
  reducers: {
    cacheLevelSteps: (state, action: PayloadAction<LevelSteps>) => {
      const payload = action.payload;
      if (!payload?.levelid) return;

      state.byId[payload.levelid] = toStructure(payload);

      // Re-caching an already-known level moves it to the back (most
      // recently used) instead of duplicating it in the order list.
      state.order = state.order.filter(id => id !== payload.levelid);
      state.order.push(payload.levelid);

      while (state.order.length > MAX_CACHED_LEVELS) {
        const oldestId = state.order.shift();
        if (oldestId) delete state.byId[oldestId];
      }
    },
  },
});

export const getLevelStepsStructure =
  (levelId: string | undefined) =>
  (state: RootState): LevelStepsStructure | undefined =>
    levelId ? state.levelSteps.byId[levelId] : undefined;

export const LevelStepsActions = levelStepsSlice.actions;
