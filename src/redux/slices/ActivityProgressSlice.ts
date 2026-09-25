import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import {
  ActivityStatus,
  LessonActivityProgress,
  LevelSteps,
} from '@/models/Lesson';

const name = 'activityProgress';

export interface ActivityProgressEntry {
  status: ActivityStatus;
  /** 0-100. Only meaningful for learning (video) activities today. */
  progress?: number;
  /** Practice/quiz only: question count from the progress endpoint. */
  questionCount?: number;
}

interface ActivityProgressState {
  // Keyed by userId (schooluserid), then by activity id (lessonlearningid /
  // lessonpracticeid / lessonquizid — UUIDs, unique across activity types).
  byUser: Record<string, Record<string, ActivityProgressEntry>>;
}

const initialState: ActivityProgressState = {
  byUser: {},
};

// done > inProgress > todo. Both server and local writes only move an
// activity's status/progress forward — see the module doc for why (a pass
// stops new attempt rows server-side; `viewed` only increments; a queued
// offline result can flush after a fresher optimistic local write lands).
const STATUS_RANK: Record<ActivityStatus, number> = {
  todo: 0,
  inProgress: 1,
  done: 2,
};

interface MergeEntryOptions {
  questionCount?: number;
}

function mergeEntry(
  existing: ActivityProgressEntry | undefined,
  status: ActivityStatus,
  progress: number | undefined,
  options?: MergeEntryOptions,
): ActivityProgressEntry {
  const roundedProgress =
    progress !== undefined ? Math.round(progress) : undefined;
  const questionCount_ = options?.questionCount ?? existing?.questionCount;
  if (!existing) {
    return {
      status,
      progress: roundedProgress,
      questionCount: questionCount_,
    };
  }
  const status_ =
    STATUS_RANK[status] > STATUS_RANK[existing.status]
      ? status
      : existing.status;
  const existingProgress = existing.progress ?? 0;
  const incomingProgress = roundedProgress ?? 0;
  const progress_ = Math.max(existingProgress, incomingProgress);
  return {
    status: status_,
    progress: progress_ > 0 ? progress_ : undefined,
    questionCount: questionCount_,
  };
}

// Shared by mergeServer (one lesson) and mergeServerLevel (every lesson in
// a level, one response object per lesson) — same per-item merge, just a
// different-shaped source. Mutates `userEntries` in place (called from
// inside an Immer draft) and returns it for convenience.
function applyActivitySnapshot(
  userEntries: Record<string, ActivityProgressEntry>,
  response: Pick<LessonActivityProgress, 'learnings' | 'practices' | 'quizzes'>,
): Record<string, ActivityProgressEntry> {
  response.learnings?.forEach(item => {
    userEntries[item.lessonlearningid] = mergeEntry(
      userEntries[item.lessonlearningid],
      item.status,
      item.progress_percentage,
    );
  });
  response.practices?.forEach(item => {
    userEntries[item.lessonpracticeid] = mergeEntry(
      userEntries[item.lessonpracticeid],
      item.status,
      undefined,
      { questionCount: item.question_count },
    );
  });
  response.quizzes?.forEach(item => {
    userEntries[item.lessonquizid] = mergeEntry(
      userEntries[item.lessonquizid],
      item.status,
      undefined,
      { questionCount: item.question_count },
    );
  });
  return userEntries;
}

export const activityProgressSlice = createSlice({
  name,
  initialState,
  reducers: {
    // Merges a full server snapshot for a lesson into the store, one entry
    // per activity id, never downgrading an activity already tracked.
    mergeServer: (
      state,
      action: PayloadAction<{
        userId: string;
        response: LessonActivityProgress;
      }>,
    ) => {
      const { userId, response } = action.payload;
      const userEntries = applyActivitySnapshot(
        state.byUser[userId] ?? {},
        response,
      );
      state.byUser[userId] = userEntries;
    },
    // Sibling of mergeServer for the multi-lesson lesson/level/:id/steps
    // response (see useLevelSteps): applies the same never-downgrade merge
    // across every lesson's items in one dispatch, instead of one call per
    // lesson.
    mergeServerLevel: (
      state,
      action: PayloadAction<{
        userId: string;
        response: LevelSteps;
      }>,
    ) => {
      const { userId, response } = action.payload;
      let userEntries = state.byUser[userId] ?? {};
      response.lessons?.forEach(lesson => {
        userEntries = applyActivitySnapshot(userEntries, lesson);
      });
      state.byUser[userId] = userEntries;
    },
    // Optimistic local write (quiz submit, practice submit, learning video
    // progress). Same never-downgrade merge rule as mergeServer.
    markLocal: (
      state,
      action: PayloadAction<{
        userId: string;
        activityId: string;
        status: ActivityStatus;
        progress?: number;
      }>,
    ) => {
      const { userId, activityId, status, progress } = action.payload;
      const userEntries = state.byUser[userId] ?? {};
      userEntries[activityId] = mergeEntry(
        userEntries[activityId],
        status,
        progress,
      );
      state.byUser[userId] = userEntries;
    },
  },
});

export const getActivityProgressByUser = (state: RootState) =>
  state.activityProgress.byUser;

export const ActivityProgressActions = activityProgressSlice.actions;
