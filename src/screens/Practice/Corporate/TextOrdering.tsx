// Corporate template 5 (word ordering).
//
// STUB: renders today's renderer, unchanged (it keeps its own footer, and
// the screen shows the ResultPopUp). Step 2 of the corporate
// question-types rebuild replaces this file, and only this file, with a
// CorporateQuestionShell and a body. See README.md in this folder.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import PracticeArrangeText from '../Components/ArrangeText/PracticeArrangeText';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateTextOrdering(props, ref) {
    return <PracticeArrangeText ref={ref} {...props} />;
  },
);
