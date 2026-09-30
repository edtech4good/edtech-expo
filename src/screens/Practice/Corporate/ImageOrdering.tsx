// Corporate template 6 (picture ordering).
//
// STUB: renders today's renderer, unchanged (it keeps its own footer, and
// the screen shows the ResultPopUp). Step 3 of the corporate
// question-types rebuild replaces this file, and only this file, with a
// CorporateQuestionShell and a body. See README.md in this folder.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import PracticeArrangeImage from '../Components/ArrangeImage/PracticeArrangeImage';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateImageOrdering(props, ref) {
    return <PracticeArrangeImage ref={ref} {...props} />;
  },
);
