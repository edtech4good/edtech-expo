import { ThemeTokens } from './types';

// Kids palette. Warm cream/peach/rose tints and the brown secondary were
// replaced on 22 Sep 2026 by the design system's cool periwinkle/lavender/
// violet family; every other value is the historical palette.
const colors: ThemeTokens['colors'] = {
  primary: '', // TEMP: mutation-proof for the theme parity CI check (reverted immediately after)
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

const kidsTokens: ThemeTokens = {
  name: 'kids',
  colors,
  fonts,
  radii,
  shadows,
};

export default kidsTokens;
