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

export type FontRole = 'display' | 'body' | 'mono';

export const familyWeights = {
  Poppins: { normal: 'Regular', semi: 'SemiBold', bold: 'Bold' },
  NotoSansKhmer: { normal: 'Regular', semi: 'SemiBold', bold: 'Bold' },
  SpaceGrotesk: { normal: 'Regular', semi: 'SemiBold', bold: 'Bold' },
  PlusJakartaSans: { normal: 'Regular', semi: 'SemiBold', bold: 'Bold' },
  SpaceMono: { normal: 'Regular', semi: 'Bold', bold: 'Bold' },
} as const;
