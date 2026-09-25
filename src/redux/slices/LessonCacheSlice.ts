import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { Lesson } from '@/models';

const name = 'lessonCache';

// Cache is unkeyed by user: it only ever holds what fetchChapters returns —
// lesson structure (ids, names, orders of learnings/practices/quizzes), never
// per-user progress or results — so there's nothing here that needs to be
// scoped to whoever is logged in.
const MAX_CACHED_LESSONS = 50;

interface LessonCacheState {
  byId: Record<string, Lesson>;
  // Insertion order (oldest first), used to evict the least-recently-cached
  // lesson once byId grows past MAX_CACHED_LESSONS, so the persisted blob
  // stays small.
  order: string[];
}

const initialState: LessonCacheState = {
  byId: {},
  order: [],
};

export const lessonCacheSlice = createSlice({
  name,
  initialState,
  reducers: {
    cacheLesson: (state, action: PayloadAction<Lesson>) => {
      const lesson = action.payload;
      if (!lesson?.lessonid) return;

      state.byId[lesson.lessonid] = lesson;

      // Re-caching an already-known lesson moves it to the back (most
      // recently used) instead of duplicating it in the order list.
      state.order = state.order.filter(id => id !== lesson.lessonid);
      state.order.push(lesson.lessonid);

      while (state.order.length > MAX_CACHED_LESSONS) {
        const oldestId = state.order.shift();
        if (oldestId) delete state.byId[oldestId];
      }
    },

    // A 404 for the lesson means it no longer exists server-side (deleted,
    // reassigned, etc.) — keep serving a stale cached copy would be wrong,
    // so drop it from both byId and the order list.
    removeCachedLesson: (state, action: PayloadAction<string>) => {
      const lessonId = action.payload;
      delete state.byId[lessonId];
      state.order = state.order.filter(id => id !== lessonId);
    },
  },
});

export const getCachedLesson =
  (lessonId: string | undefined) =>
  (state: RootState): Lesson | undefined =>
    lessonId ? state.lessonCache.byId[lessonId] : undefined;

export const LessonCacheActions = lessonCacheSlice.actions;
