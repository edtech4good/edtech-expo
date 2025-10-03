export type TemplateType =
  | 'MCQSingleText'
  | 'MCQMultiText'
  | 'MCQSingleImage'
  | 'MCQMultiImage'
  | 'TextOrdering'
  | 'ImageOrdering'
  | 'DragDrop'
  | 'FillInBlank'
  | 'DOption1'
  | 'DOption3'
  | 'DOption4'
  | 'FOption1'
  | 'FOption2'
  | 'FOption4'
  | 'Fraction';

export const TemplateTypeById = {
  1: 'MCQSingleText',
  2: 'MCQSingleImage',
  3: 'MCQMultiText',
  4: 'MCQMultiImage',
  5: 'TextOrdering',
  6: 'ImageOrdering',
  7: 'DragDrop',
  8: 'FillInBlank',
  18: 'DOption1',
  19: 'DOption3',
  20: 'DOption4',
  21: 'FOption1',
  22: 'FOption2',
  23: 'FOption4',
  24: 'Fraction',
} as Record<number, TemplateType>;

export const TemplateTypeId: Record<TemplateType, number> = {
  MCQSingleText: 1,
  MCQSingleImage: 2,
  MCQMultiText: 3,
  MCQMultiImage: 4,
  TextOrdering: 5,
  ImageOrdering: 6,
  DragDrop: 7,
  FillInBlank: 8,
  DOption1: 18,
  DOption3: 19,
  DOption4: 20,
  FOption1: 21,
  FOption2: 22,
  FOption4: 23,
  Fraction: 24,
};
