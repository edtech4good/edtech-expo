import { ThemeTokens } from './types';

const colors: ThemeTokens['colors'] = {
  primary: '#0B5FFF',
  primaryLight: '#E7EFFF',
  primaryDark: '#0044FF',
  primaryPressed: '#0044FF',
  onPrimary: '#FFFFFF',

  secondary: '#5A6B80',
  secondaryLight: '#94A3B8',
  secondaryDark: '#2B3A4B',
  onSecondary: '#FFFFFF',

  // v2 decision (26 Sep 2026): page background is white, matching the
  // handoff's white screens — the cool paper #F3F5FF (itself a 22 Sep 2026
  // replacement for the Glean cream #FFF9EE) is retired.
  background: '#FFFFFF',
  onBackground: '#09101D',

  surface: '#FFFFFF',
  onSurface: '#2B3A4B',

  surfaceVariant: '#F4F6F9',
  onSurfaceVariant: '#5A6B80',

  outline: '#CDD5E0',
  divider: '#E3E8EF',
  // Track for the mint progress fill. #22DB8D on the #E3E8EF hairline is
  // 1.47:1; this slate is 3.01:1 against the fill and 5.46:1 on white
  // (WCAG UI-component floor is 3:1). The quiz variant keeps `divider`.
  // v2 handoff sets this to #5A6B80 (the `secondary` text color) exactly.
  progressTrack: '#5A6B80',
  // U-03: placeholder on white 2.56 -> 5.46
  placeholder: '#5A6B80',
  shadow: 'rgba(9,16,29,0.05)',
  // U-24: onPrimary-on-error (white text/icons) 2.97 -> 4.99
  error: '#C7420A',
  customAppBar: '#FFFFFF',
  customHeaderTitle: '#09101D',

  // U-23: selection ring on white 2.67 -> 4.14
  selection: '#078A95',
  success: '#22DB8D',
  // StatusIcon's done-check mark on the mint `success` disc: #064E32 on
  // #22DB8D is 5.40:1 (WCAG UI-component floor is 3:1).
  onSuccess: '#064E32',
  // v2.1: "Done" status word on the lesson row (white bg) — #0F7A4F on
  // white is 4.6:1+.
  successText: '#0F7A4F',
  warning: '#FFC228',
  // U-21: warningText on 18% warning tint 2.86 -> 7.01
  warningText: '#6B4B00',
  // U-22: onPrimary (white) on lessonChip 2.66 -> 5.37
  lessonChip: '#16729A',
  videoAccent: '#00A2E3',

  cards: [
    {
      light: '#FFFFFF',
      primary: '#F4F6F9',
      highlight: '#0B5FFF',
    },
    {
      light: '#FFFFFF',
      primary: '#E9FBF3',
      highlight: '#22DB8D',
    },
    {
      light: '#FFFFFF',
      primary: '#E6F7F8',
      highlight: '#06AFBC',
    },
    {
      light: '#FFFFFF',
      primary: '#E6DDFF',
      highlight: '#6D5BD0',
    },
    {
      light: '#FFFFFF',
      primary: '#F3EEFF',
      highlight: '#FF640D',
    },
    {
      light: '#FFFFFF',
      primary: '#EDF1F7',
      highlight: '#5A6B80',
    },
  ],
};

// The corporate display/body faces have no Khmer glyphs, so Khmer
// deliberately falls back to NotoSansKhmer across all roles.
const fonts: ThemeTokens['fonts'] = {
  en: {
    display: 'SpaceGrotesk',
    body: 'PlusJakartaSans',
    mono: 'SpaceMono',
  },
  km: {
    display: 'NotoSansKhmer',
    body: 'NotoSansKhmer',
    mono: 'NotoSansKhmer',
  },
};

// Locale-aware type scale (design v2.1 "Khmer type scale"; Latin values are
// the handoff's phone/tablet comparison column, already mirrored by the
// legacy Metrics.fontSizes tokens elsewhere in the theme). Weights map to
// useFont's FontWeight ('normal' | 'semi' | 'bold').
const typeScale: ThemeTokens['typeScale'] = {
  en: {
    phone: {
      screenTitle: { fontSize: 28, lineHeight: 34, weight: 'bold' },
      cardTitle: { fontSize: 20, lineHeight: 26, weight: 'bold' },
      button: { fontSize: 15, lineHeight: 22, weight: 'semi' },
      body: { fontSize: 14, lineHeight: 22, weight: 'normal' },
      caption: { fontSize: 12, lineHeight: 16, weight: 'normal' },
      eyebrow: { fontSize: 12, lineHeight: 16, weight: 'normal' },
    },
    tablet: {
      // Handoff: "tablet promotes one notch" — only screen/card titles have
      // a distinct tablet value; other roles are unchanged from phone.
      screenTitle: { fontSize: 34, lineHeight: 40, weight: 'bold' },
      cardTitle: { fontSize: 24, lineHeight: 30, weight: 'bold' },
      button: { fontSize: 15, lineHeight: 22, weight: 'semi' },
      body: { fontSize: 14, lineHeight: 22, weight: 'normal' },
      caption: { fontSize: 12, lineHeight: 16, weight: 'normal' },
      eyebrow: { fontSize: 12, lineHeight: 16, weight: 'normal' },
    },
  },
  km: {
    phone: {
      screenTitle: { fontSize: 26, lineHeight: 44, weight: 'bold' },
      cardTitle: { fontSize: 19, lineHeight: 32, weight: 'bold' },
      button: { fontSize: 15, lineHeight: 26, weight: 'semi' },
      body: { fontSize: 14, lineHeight: 26, weight: 'normal' },
      // Khmer floor: never below 13px.
      caption: { fontSize: 13, lineHeight: 22, weight: 'normal' },
      eyebrow: { fontSize: 13, lineHeight: 20, weight: 'semi' },
    },
    tablet: {
      screenTitle: { fontSize: 32, lineHeight: 52, weight: 'bold' },
      cardTitle: { fontSize: 22, lineHeight: 36, weight: 'bold' },
      button: { fontSize: 15, lineHeight: 26, weight: 'semi' },
      body: { fontSize: 14, lineHeight: 26, weight: 'normal' },
      caption: { fontSize: 13, lineHeight: 22, weight: 'normal' },
      eyebrow: { fontSize: 13, lineHeight: 20, weight: 'semi' },
    },
  },
};

const radii: ThemeTokens['radii'] = {
  pill: 999,
  card: 16,
  input: 16,
  dialog: 20,
  media: 12,
  imageWell: 10,
};

const shadows: ThemeTokens['shadows'] = {
  glow: 'rgba(11,95,255,0.25)',
  card: 'rgba(9,16,29,0.05)',
};

const corporateTokens: ThemeTokens = {
  name: 'corporate',
  colors,
  fonts,
  radii,
  shadows,
  typeScale,
};

export default corporateTokens;
