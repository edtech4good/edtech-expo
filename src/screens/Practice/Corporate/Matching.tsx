// Corporate template 7 (matching).
//
// STUB: renders today's renderer, unchanged (it keeps its own footer, and
// the screen shows the ResultPopUp). Step 4 of the corporate
// question-types rebuild replaces this file, and only this file, with a
// CorporateQuestionShell and a body. See README.md in this folder.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import PracticeDragDrop from '../Components/DragDrop/PracticeDragDrop';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateMatching(props, ref) {
    return <PracticeDragDrop ref={ref} {...props} />;
  },
);
