/**
 * Whether the lesson video is full screen right now. The orientation policy
 * (useOrientationPolicy) reads it to let a phone turn to landscape for the
 * duration; the lesson screen sets it. It is module state on purpose: a JS
 * reload resets it to false, which is exactly the "lock comes back after a
 * reload" requirement, and no screen has to remember to clear it.
 */
import { useSyncExternalStore } from 'react';

let videoFullScreen = false;
const listeners = new Set<() => void>();

export function isVideoFullScreen(): boolean {
  return videoFullScreen;
}

export function setVideoFullScreen(next: boolean): void {
  if (videoFullScreen === next) return;
  videoFullScreen = next;
  listeners.forEach(listener => listener());
}

export function subscribeVideoFullScreen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useVideoFullScreen(): boolean {
  return useSyncExternalStore(
    subscribeVideoFullScreen,
    isVideoFullScreen,
    isVideoFullScreen,
  );
}
