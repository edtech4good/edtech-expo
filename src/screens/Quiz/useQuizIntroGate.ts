import { useCallback, useRef, useState } from 'react';

import { introStartAction, showQuizIntro } from './introGate';

export interface QuizIntroGateOptions {
  isCorporate: boolean;
  /** Loads the quiz questions (may reject; the gate swallows that). */
  fetch: () => Promise<unknown>;
  /** How many questions are loaded right now. */
  questionCount: number;
  /** Runs once, when Start begins the quiz (reset the quiz clock here). */
  onBegin: () => void;
}

/**
 * State of the corporate quiz intro: whether it is showing, whether the
 * questions are loading, and what Start does. Kept out of QuizScreen so it can
 * be tested by behaviour.
 *
 * Only `start()` can leave the intro: finishing a load never starts the quiz,
 * and a later reload never brings the intro back.
 */
export default function useQuizIntroGate({
  isCorporate,
  fetch,
  questionCount,
  onBegin,
}: QuizIntroGateOptions) {
  const [started, setStarted] = useState(false);
  // True until the first load settles, so Start is busy (not "no questions")
  // for the frame before the fetch begins.
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchRef.current();
    } catch {
      // offline or server error: questions stay empty; Start offers a retry
    } finally {
      setLoading(false);
    }
  }, []);

  const start = () => {
    const action = introStartAction(loading, questionCount);
    if (action === 'wait') return;
    if (action === 'retry') {
      void load();
      return;
    }
    onBegin();
    setStarted(true);
  };

  return { visible: showQuizIntro(isCorporate, started), started, loading, load, start };
}
