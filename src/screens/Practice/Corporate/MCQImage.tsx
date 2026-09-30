// Corporate templates 2 and 4 (multiple choice, pictures).
//
// STUB: renders today's renderer, unchanged (it keeps its own footer, and
// the screen shows the ResultPopUp). Step 6 of the corporate
// question-types rebuild replaces this file, and only this file, with a
// CorporateQuestionShell and a body. See README.md in this folder.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import PracticeMCQImage from '../Components/MCQImage/PracticeMCQImage';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateMCQImage(props, ref) {
    return <PracticeMCQImage ref={ref} {...props} />;
  },
);
