// Corporate word ordering (template 5): CorporateQuestionShell with
// TextOrderingBody. Grading is today's rule (gradeArrangeText).
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import CorporateQuestionShell from './CorporateQuestionShell';
import TextOrderingBody from './TextOrderingBody';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateTextOrdering(props, ref) {
    return <CorporateQuestionShell ref={ref} {...props} Body={TextOrderingBody} />;
  },
);
