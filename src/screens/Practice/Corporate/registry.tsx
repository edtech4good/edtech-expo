// The one place a question's template id becomes a renderer. PracticeContent
// asks this; nothing else should. Do not edit it in steps 2 to 6: replace
// your type's file (MCQImage.tsx, TextOrdering.tsx, ...) instead.
import { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react';

import { TemplateTypeId } from '@/constants';
import { PracticeHandler } from '@/models';
import type { PracticeProps } from '../PracticeScreen';

import PracticeMCQText from '../Components/MCQText/PracticeMCQText';
import PracticeMCQImage from '../Components/MCQImage/PracticeMCQImage';
import PracticeArrangeText from '../Components/ArrangeText/PracticeArrangeText';
import PracticeArrangeImage from '../Components/ArrangeImage/PracticeArrangeImage';
import PracticeDragDrop from '../Components/DragDrop/PracticeDragDrop';
import PracticeFillBlank from '../Components/FillBlank/PracticeFillBlank';
import DOption1 from '../Components/Prototypes/DOption1/DOption1';
import DOption3 from '../Components/Prototypes/DOption3/DOption3';
import DOption4 from '../Components/Prototypes/DOption4/DOption4';
import FOption1 from '../Components/Prototypes/FOption1/FOption1';
import FOption2 from '../Components/Prototypes/FOption2/FOption2';
import FOption4 from '../Components/Prototypes/FOption4/FOption4';
import PracticeFraction from '../Components/Fraction/PracticeFraction';

import CorporateMCQText from './MCQText';
import CorporateMCQImage from './MCQImage';
import CorporateTextOrdering from './TextOrdering';
import CorporateImageOrdering from './ImageOrdering';
import CorporateMatching from './Matching';
import CorporateFillBlank from './FillBlank';
import { chooseModule, CorporateModuleName } from './templateRegistry';

/** Every renderer takes today's props and exposes today's handle. */
export type QuestionModule =
  | ForwardRefExoticComponent<PracticeProps & RefAttributes<PracticeHandler>>
  | ComponentType<PracticeProps & RefAttributes<PracticeHandler>>;

/** Today's renderers, by template id (what the app shows kids-theme schools). */
export const KIDS_MODULES: Readonly<Record<number, QuestionModule>> = {
  [TemplateTypeId.MCQSingleText]: PracticeMCQText,
  [TemplateTypeId.MCQMultiText]: PracticeMCQText,
  [TemplateTypeId.MCQSingleImage]: PracticeMCQImage,
  [TemplateTypeId.MCQMultiImage]: PracticeMCQImage,
  [TemplateTypeId.TextOrdering]: PracticeArrangeText,
  [TemplateTypeId.ImageOrdering]: PracticeArrangeImage,
  [TemplateTypeId.DragDrop]: PracticeDragDrop,
  [TemplateTypeId.FillInBlank]: PracticeFillBlank,
  [TemplateTypeId.DOption1]: DOption1,
  [TemplateTypeId.DOption3]: DOption3,
  [TemplateTypeId.DOption4]: DOption4,
  [TemplateTypeId.FOption1]: FOption1,
  [TemplateTypeId.FOption2]: FOption2,
  [TemplateTypeId.FOption4]: FOption4,
  [TemplateTypeId.Fraction]: PracticeFraction,
};

/** The corporate modules, one file each (exhaustive: tsc fails if one is missing). */
export const CORPORATE_MODULES: Readonly<Record<CorporateModuleName, QuestionModule>> = {
  MCQText: CorporateMCQText,
  MCQImage: CorporateMCQImage,
  TextOrdering: CorporateTextOrdering,
  ImageOrdering: CorporateImageOrdering,
  Matching: CorporateMatching,
  FillBlank: CorporateFillBlank,
};

/** The renderer for a template id and theme, or undefined for an unknown template. */
export function resolveQuestionModule(
  templateId: number,
  isCorporate: boolean,
): QuestionModule | undefined {
  const choice = chooseModule(templateId, isCorporate);
  return choice.theme === 'corporate'
    ? CORPORATE_MODULES[choice.name]
    : KIDS_MODULES[choice.templateId];
}
