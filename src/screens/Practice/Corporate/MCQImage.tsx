// Corporate multiple choice, pictures (templates 2 and 4): the shell with the
// picture-choice body. Grading is the shared rule (see imageChoice/).
import { forwardRef } from 'react';

import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';
import CorporateQuestionShell from './CorporateQuestionShell';
import McqImageBody from './imageChoice/McqImageBody';

export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateMCQImage(props, ref) {
    return <CorporateQuestionShell ref={ref} {...props} Body={McqImageBody} />;
  },
);
