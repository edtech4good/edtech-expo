import { combineReducers } from 'redux';
import {
  authenticationSlice,
  courseSlice,
  lessonSlice,
  levelSlice,
  selectionSlice,
  settingSlice,
  standardSlice,
  subjectSlice,
  unitSlice,
} from './slices';
import { resultSlice } from './slices/ResultSlice';

export const combinedReducers = combineReducers({
  [authenticationSlice.name]: authenticationSlice.reducer,
  [courseSlice.name]: courseSlice.reducer,
  [lessonSlice.name]: lessonSlice.reducer,
  [levelSlice.name]: levelSlice.reducer,
  [settingSlice.name]: settingSlice.reducer,
  [subjectSlice.name]: subjectSlice.reducer,
  [unitSlice.name]: unitSlice.reducer,
  [resultSlice.name]: resultSlice.reducer,
  [selectionSlice.name]: selectionSlice.reducer,
  [standardSlice.name]: standardSlice.reducer,
});
