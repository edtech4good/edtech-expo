import { useEffect, useRef } from 'react';

import type { QuestionBodyProps, QuestionEvaluation } from './types';

/**
 * How a body tells the shell whether Submit is enabled and how to grade.
 * Call it on every render with the current values:
 *
 *   useReportAnswer(props.report, ready, () => ({ iscorrect, answer, perItem }));
 *
 * `evaluate` may be a fresh closure each render: the shell always calls the
 * latest one. The shell is re-told only when `ready` changes.
 */
export function useReportAnswer(
  report: QuestionBodyProps['report'],
  ready: boolean,
  evaluate: () => QuestionEvaluation,
) {
  const latest = useRef(evaluate);
  latest.current = evaluate;

  useEffect(() => {
    report({ ready, evaluate: () => latest.current() });
  }, [report, ready]);
}
