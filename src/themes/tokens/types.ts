// Pure type definitions for theme tokens. This module (and every module it
// imports) must stay free of react-native imports so it can be loaded by a
// plain node/tsx script (see src/themes/__tests__/themeParity.ts).

export interface ThemeCard {
  light: string;
  primary: string;
  highlight: string;
}

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryPressed: string;
  onPrimary: string;

  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  onSecondary: string;

  background: string;
  onBackground: string;

  surface: string;
  onSurface: string;

  surfaceVariant: string;
  onSurfaceVariant: string;

  outline: string;
  divider: string;
  progressTrack: string;
  placeholder: string;
  shadow: string;

  error: string;
  customAppBar: string;
  customHeaderTitle: string;

  selection: string;
  success: string;
  onSuccess: string;
  /** Text-only "Done" color for status words (lesson row status, step-dot labels) — a darker green than the `success` disc fill so 14/12px text stays readable on white. Also used as the done step dot's fill (LessonStepDots), not just the "Done" label text. */
  successText: string;
  warning: string;
  warningText: string;
  lessonChip: string;
  videoAccent: string;

  cards: ThemeCard[];
}

export type FontRole = 'display' | 'body' | 'mono';

export interface ThemeFontsForLanguage {
  display: string;
  body: string;
  mono: string;
}

export interface ThemeFonts {
  en: ThemeFontsForLanguage;
  km: ThemeFontsForLanguage;
}

// Locale- (and form-factor-) aware type scale — design v2.1 "Khmer type
// scale" (docs handoff §v2.1 additions). Kept local rather than importing
// FontWeight from @/constants: that barrel re-exports CardColor.ts, which
// imports react-native, and this module (like the rest of tokens/) must stay
// loadable by plain node/tsx (see themeParity.ts).
export type TypeScaleWeight = 'normal' | 'semi' | 'bold';

export interface TypeRoleSpec {
  fontSize: number;
  lineHeight: number;
  weight: TypeScaleWeight;
}

/** screenTitle/cardTitle/button/body/caption/eyebrow — the six roles the
 * v2.1 Khmer type scale spec calls out. */
export type TypeScaleRole =
  | 'screenTitle'
  | 'cardTitle'
  | 'button'
  | 'body'
  | 'caption'
  | 'eyebrow';

export type TypeScaleForFormFactor = Record<TypeScaleRole, TypeRoleSpec>;

export interface TypeScaleForLanguage {
  phone: TypeScaleForFormFactor;
  /** Titles promote one step on tablet; other roles are unchanged from
   * phone per the handoff (only screenTitle/cardTitle get tablet values). */
  tablet: TypeScaleForFormFactor;
}

export interface ThemeTypeScale {
  en: TypeScaleForLanguage;
  km: TypeScaleForLanguage;
}

export interface ThemeRadii {
  pill: number;
  card: number;
  input: number;
  dialog: number;
  media: number;
  imageWell: number;
}

export interface ThemeShadows {
  glow: string;
  card: string;
}

export interface ThemeTokens {
  name: 'kids' | 'corporate';
  colors: ThemeColors;
  fonts: ThemeFonts;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  typeScale: ThemeTypeScale;
}
