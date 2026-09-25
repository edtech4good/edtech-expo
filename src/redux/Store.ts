import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import { combinedReducers } from './CombinedReducers';
import {
  authenticationSlice,
  selectionSlice,
  settingSlice,
  pendingResultSlice,
  activityProgressSlice,
  lessonCacheSlice,
  levelStepsSlice,
  librarySlice,
} from './slices';
import { setAccessToken } from '@/services/secureToken';

const logger = createLogger({
  duration: true,
  timestamp: true,
});

// accessToken lives in expo-secure-store, not AsyncStorage — this transform
// strips it from the authentication slice before it's written to disk. The
// inbound side also doubles as a one-time, quiet migration: an install that
// persisted an accessToken before this change moves it into SecureStore on
// its next rehydrate, and it's dropped from the state redux-persist merges
// in (so it never gets written back to AsyncStorage either).
const authTransform = createTransform(
  (inboundState: any) => {
    const { accessToken, ...rest } = inboundState || {};
    return rest;
  },
  (outboundState: any) => {
    if (outboundState?.accessToken) {
      setAccessToken(outboundState.accessToken).catch(() => {});
    }
    const { accessToken, ...rest } = outboundState || {};
    return rest;
  },
  { whitelist: [authenticationSlice.name] },
);

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: [
    authenticationSlice.name,
    selectionSlice.name,
    settingSlice.name,
    pendingResultSlice.name,
    activityProgressSlice.name,
    lessonCacheSlice.name,
    levelStepsSlice.name,
    librarySlice.name,
  ],
  transforms: [authTransform],
  // Wait for AsyncStorage however long it takes. redux-persist's default 5 s
  // timeout rehydrates with EMPTY state when the read is slow (a cold start on
  // a low-end tablet, or a dev bundle still loading), ignores the real data
  // when it arrives, and immediately writes the empty state back over it:
  // the session and the unsynced pendingResult queue are gone. PersistGate
  // holds the UI until rehydration, so the cost is that a read that never
  // returns keeps the app on the start screen; relaunching retries it.
  // Losing a learner's offline results is the worse failure.
  timeout: 0,
};

const reducers = (state: any, action: never) => {
  return combinedReducers(state, action);
};

const persistedReducer = persistReducer(persistConfig, reducers);

export const store = configureStore({
  reducer: persistedReducer,
  devTools: __DEV__,
  middleware: getDefaultMiddleware => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    });
    return __DEV__ ? middleware.concat(logger) : middleware;
  },
});

export const persistor = persistStore(store);
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
