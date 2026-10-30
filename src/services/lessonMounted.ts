/**
 * Whether a lesson's video screen is mounted right now. The nav shell is frozen
 * while it is (see resolveShell): a width change must not swap Tabs for Drawer
 * in the home layout and remount the lesson under the video, whether the
 * learner is in full screen or has just left it in the other orientation
 * (edtech-expo#143). Set and cleared by LessonScreen (useFullScreenCleanup).
 */
import { useSyncExternalStore } from 'react';

let lessonMounted = false;
const listeners = new Set<() => void>();

export function isLessonMounted(): boolean {
  return lessonMounted;
}

export function setLessonMounted(next: boolean): void {
  if (lessonMounted === next) return;
  lessonMounted = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLessonMounted(): boolean {
  return useSyncExternalStore(subscribe, isLessonMounted, isLessonMounted);
}
