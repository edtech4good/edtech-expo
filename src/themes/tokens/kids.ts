import { ThemeTokens } from './types';

// Kids palette. Warm cream/peach/rose tints and the brown secondary were
// replaced on 22 Sep 2026 by the design system's cool periwinkle/lavender/
// violet family; every other value is the historical palette.
const colors: ThemeTokens['colors'] = {
  primary: '#0B5FFF',
  primaryLight: '#E7EFFF',
  primaryDark: '#0843B2',
  primaryPressed: '#0843B2',
  onPrimary: '#FFFFFF',

  secondary: '#6D5BD0',
  secondaryLight: '#8F7FE8',
  secondaryDark: '#6D5BD0',
  onSecondary: '#FFFFFF',

  background: '#F1F5F9',
  onBackground: '#1E293B',

  surface: '#FFFFFF',
  onSurface: '#1E293B',

  surfaceVariant: '#E7EFFF',
  onSurfaceVariant: '#64748B',

  outline: '#1E293B',
  divider: '#CBD5E1',
  // Same as divider: kids never renders ProgressBar outside the dev gallery,
  // and the value equals `divider` so the gallery is unaffected too. The key
  // exists for theme parity.
  progressTrack: '#CBD5E1',
  placeholder: '#94A3B8',
  shadow: '#00000015',
  error: '#FF640D',
  customAppBar: '#F8FAFC',
  customHeaderTitle: '#334155',

  selection: '#06AFBC',
  success: '#22DB8D',
  // Same value and same rationale as corporate: #064E32 on #22DB8D is 5.40:1.
  onSuccess: '#064E32',
  // Parity only — kids has no lesson-row "Done" status word today. Kept
  // identical to corporate's `successText` (#0F7A4F) rather than inventing
  // a kids-specific dark green, since kids never renders it outside the
  // theme-parity check.
  successText: '#0F7A4F',
  warning: '#FFC228',
  warningText: '#B8860B',
  lessonChip: '#2AAADD',
  videoAccent: '#00A2E3',

  // Card Color. Index semantics are fixed by StudentDashboardScreen.tsx:
  // 0 = Bridge / generic dashboard tint (periwinkle), 1 = Grade 7 (lavender,
  // orange accent), 2 = Grade 8 (blue), 3 = Grade 9 (violet); 4 and 5 are
  // extra rotation slots (teal, slate). Tints come from the EdTech for Good
  // design system (docs/design/design-system/tokens/colors.css in the
  // workspace): cream/peach/rose were retired in favour of these cool tints.
  cards: [
    {
      light: '#F5F6FF',
      primary: '#E8ECFF',
      highlight: '#0B5FFF',
    },
    {
      light: '#F3EEFF',
      primary: '#E6DDFF',
      highlight: '#FF640D',
    },
    {
      light: '#EAF2FF',
      primary: '#D6E6FF',
      highlight: '#3B82F6',
    },
    {
      light: '#E4E1F7',
      primary: '#B9B4E8',
      highlight: '#6D5BD0',
    },
    {
      light: '#E4F6F8',
      primary: '#CDEFF2',
      highlight: '#078A95',
    },
    {
      light: '#F8FAFC',
      primary: '#E2E8F0',
      highlight: '#475569',
    },
  ],
};

const fonts: ThemeTokens['fonts'] = {
  en: { display: 'Poppins', body: 'Poppins', mono: 'Poppins' },
  km: {
    display: 'NotoSansKhmer',
    body: 'NotoSansKhmer',
    mono: 'NotoSansKhmer',
  },
};

const radii: ThemeTokens['radii'] = {
  pill: 999,
  card: 8,
  input: 8,
  dialog: 12,
  media: 8,
  imageWell: 8,
};

const shadows: ThemeTokens['shadows'] = {
  glow: 'rgba(11,95,255,0.25)',
  card: '#00000015',
};

// Kids has no design-v2.1 Khmer type scale of its own (that work is
// corporate-only) — mirrors corporate's values so theme parity holds and a
// future kids consumer of useTypeRole gets sane numbers rather than none.
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

const kidsTokens: ThemeTokens = {
  name: 'kids',
  colors,
  fonts,
  radii,
  shadows,
  typeScale,
};

export default kidsTokens;
