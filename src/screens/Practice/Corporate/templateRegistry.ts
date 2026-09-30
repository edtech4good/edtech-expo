// Which renderer a question gets, as data (no react-native imports, so the
// rule is tested in plain node: `yarn test:shell`). registry.tsx maps these
// names to components.
import { TemplateTypeId } from '../../../constants/QuestionTemplate';

/**
 * One corporate module per question type, each in its own file in this
 * folder. Steps 2 to 6 of the rebuild each replace ONE of those files.
 */
export type CorporateModuleName =
  | 'MCQText'
  | 'MCQImage'
  | 'TextOrdering'
  | 'ImageOrdering'
  | 'Matching'
  | 'FillBlank';

/** Templates 1 to 8. Anything else (fractions, the prototypes) keeps today's renderer. */
export const CORPORATE_MODULE_BY_TEMPLATE: Readonly<Record<number, CorporateModuleName>> = {
  [TemplateTypeId.MCQSingleText]: 'MCQText',
  [TemplateTypeId.MCQMultiText]: 'MCQText',
  [TemplateTypeId.MCQSingleImage]: 'MCQImage',
  [TemplateTypeId.MCQMultiImage]: 'MCQImage',
  [TemplateTypeId.TextOrdering]: 'TextOrdering',
  [TemplateTypeId.ImageOrdering]: 'ImageOrdering',
  [TemplateTypeId.DragDrop]: 'Matching',
  [TemplateTypeId.FillInBlank]: 'FillBlank',
};

export type ModuleChoice =
  | { theme: 'corporate'; name: CorporateModuleName }
  | { theme: 'kids'; templateId: number };

/**
 * Corporate schools get the corporate module for templates 1 to 8; every
 * other case (a kids-theme school, or a template the corporate set does
 * not cover) gets today's renderer for the template.
 */
export function chooseModule(templateId: number, isCorporate: boolean): ModuleChoice {
  const name = isCorporate ? CORPORATE_MODULE_BY_TEMPLATE[templateId] : undefined;
  return name ? { theme: 'corporate', name } : { theme: 'kids', templateId };
}
