// Corporate picture ordering (template 6): CorporateQuestionShell with
// ImageOrderingBody. The body, its grading and its sizing are in the
// ImageOrdering folder next to this file.
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import CorporateQuestionShell from './CorporateQuestionShell';
import ImageOrderingBody from './ImageOrdering/ImageOrderingBody';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateImageOrdering(props, ref) {
    return <CorporateQuestionShell ref={ref} {...props} Body={ImageOrderingBody} />;
  },
);
