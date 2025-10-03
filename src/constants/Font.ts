export type FontFamily =
  | 'PoppinsRegular'
  | 'PoppinsSemiBold'
  | 'PoppinsBold'
  | 'NotoSansKhmerRegular'
  | 'NotoSansKhmerSemiBold'
  | 'NotoSansKhmerBold';

export const fontFamilies = {
  en: 'Poppins',
  km: 'NotoSansKhmer',
} as const;

export type FontWeight = 'normal' | 'semi' | 'bold';

export const fontWeights = {
  normal: 'Regular',
  semi: 'SemiBold',
  bold: 'Bold',
} as const;
