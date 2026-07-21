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
  placeholder: string;
  shadow: string;

  error: string;
  customAppBar: string;
  customHeaderTitle: string;

  selection: string;
  success: string;
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
}
