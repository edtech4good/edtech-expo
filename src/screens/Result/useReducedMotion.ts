import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when the OS asks for reduced motion (iOS/Android setting; on web,
 * `prefers-reduced-motion: reduce`). `null` until the answer arrives, so a
 * caller can hold still rather than animate for someone who asked it not to.
 */
export default function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => alive && setReduced(Boolean(v)))
      .catch(() => alive && setReduced(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v =>
      setReduced(Boolean(v)),
    );
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}
