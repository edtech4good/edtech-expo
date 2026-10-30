import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { setLessonMounted } from '../../services/lessonMounted';
import { setVideoFullScreen } from '../../services/videoFullScreen';

/**
 * The lesson's mount and unmount bookkeeping for full screen: while it is
 * mounted the nav shell is frozen (lessonMounted); leaving the lesson (unmount)
 * while its video is full screen must give the portrait lock back and leave the
 * browser's full screen. A phone left on the
 * "any orientation" policy after the lesson is gone would keep rotating on
 * every screen. `onLeave` lets the screen reset its own bookkeeping.
 */
export default function useFullScreenCleanup(onLeave?: () => void): void {
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  useEffect(() => {
    setLessonMounted(true);
    return () => {
      onLeaveRef.current?.();
      setLessonMounted(false);
      setVideoFullScreen(false);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        if (document.fullscreenElement)
          document.exitFullscreen?.().catch(() => undefined);
      }
    };
  }, []);
}
