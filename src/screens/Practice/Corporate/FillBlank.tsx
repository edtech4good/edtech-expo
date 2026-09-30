// Corporate fill in the blank (template 8): CorporateQuestionShell with
// FillBlankBody. Grading is shared with the kids renderer
// (Components/FillBlank/fillBlankGrade.ts).
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import CorporateQuestionShell from './CorporateQuestionShell';
import FillBlankBody from './FillBlank/FillBlankBody';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateFillBlank(props, ref) {
    return <CorporateQuestionShell ref={ref} {...props} Body={FillBlankBody} />;
  },
);
