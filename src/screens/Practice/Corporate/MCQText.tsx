// Corporate multiple choice, text (templates 1 and 3).
//
// The reference implementation of the shell: CorporateQuestionShell with
// McqTextBody. It is also the text half of step 6 (multiple choice
// alignment); step 6 does the picture half in MCQImage.tsx.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import CorporateQuestionShell from './CorporateQuestionShell';
import McqTextBody from './McqTextBody';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateMCQText(props, ref) {
    return <CorporateQuestionShell ref={ref} {...props} Body={McqTextBody} />;
  },
);
