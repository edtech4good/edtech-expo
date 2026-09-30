// Corporate template 8 (fill in the blank).
//
// STUB: renders today's renderer, unchanged (it keeps its own footer, and
// the screen shows the ResultPopUp). Step 5 of the corporate
// question-types rebuild replaces this file, and only this file, with a
// CorporateQuestionShell and a body. See README.md in this folder.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import PracticeFillBlank from '../Components/FillBlank/PracticeFillBlank';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateFillBlank(props, ref) {
    return <PracticeFillBlank ref={ref} {...props} />;
  },
);
