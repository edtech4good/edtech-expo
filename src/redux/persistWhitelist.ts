import { authenticationSlice } from './slices/AuthenticationSlice';
import { selectionSlice } from './slices/SelectionSlice';
import { settingSlice } from './slices/SettingSlice';
import { pendingResultSlice } from './slices/PendingResultSlice';
import { activityProgressSlice } from './slices/ActivityProgressSlice';
import { lessonCacheSlice } from './slices/LessonCacheSlice';
import { levelStepsSlice } from './slices/LevelStepsSlice';
import { librarySlice } from './slices/LibrarySlice';
import { progressSlice } from './slices/ProgressSlice';
import { awardsSlice } from './slices/AwardsSlice';
import { certificatesSlice } from './slices/CertificatesSlice';

/**
 * The slices redux-persist writes to disk (Store.ts persistConfig). Kept in
 * its own module, free of native imports, so a test can read it.
 */
export const persistWhitelist: string[] = [
  authenticationSlice.name,
  selectionSlice.name,
  settingSlice.name,
  pendingResultSlice.name,
  activityProgressSlice.name,
  lessonCacheSlice.name,
  levelStepsSlice.name,
  librarySlice.name,
  progressSlice.name,
  awardsSlice.name,
  certificatesSlice.name,
];
