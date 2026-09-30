// Corporate matching (template 7): CorporateQuestionShell with MatchingBody.
// The body, its pure logic (matchingLogic.ts) and its tests
// (__tests__/matching.ts, `yarn test:matching`) sit beside it.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import CorporateQuestionShell from './CorporateQuestionShell';
import MatchingBody from './Matching/MatchingBody';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateMatching(props, ref) {
    return <CorporateQuestionShell ref={ref} {...props} Body={MatchingBody} />;
  },
);
