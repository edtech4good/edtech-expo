import { ThemeTokens } from './types';

// Colors below are the historical `src/themes/Colors.tsx` palette, kept
// verbatim, plus the new shared keys required for corporate-theme parity.
const colors: ThemeTokens['colors'] = {
  primary: '#0B5FFF',
  primaryLight: '#E7EFFF',
  primaryDark: '#0843B2',
  primaryPressed: '#0843B2',
  onPrimary: '#FFFFFF',

  secondary: '#685B55',
  secondaryLight: '#867C77',
  secondaryDark: '#867C77',
  onSecondary: '#FFFFFF',

  background: '#F1F5F9',
  onBackground: '#1E293B',

  surface: '#FFFFFF',
  onSurface: '#1E293B',

  surfaceVariant: '#E7EFFF',
  onSurfaceVariant: '#64748B',

  outline: '#1E293B',
  divider: '#CBD5E1',
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

  // Card Color
  cards: [
    {
      light: '#FFFBF2',
      primary: '#FCF4E3',
      highlight: '#FFBA33',
    },
    {
      light: '#FFF5ED',
      primary: '#FFEBDA',
      highlight: '#FF640D',
    },
    {
      light: '#f3f6eb',
      primary: '#E8EDD6',
      highlight: '#5C6D20',
    },
    {
      light: '#dbf5f7',
      primary: '#B4EBEF',
      highlight: '#1B0E08',
    },
    {
      light: '#FEEFEF',
      primary: '#FFDEDE',
      highlight: '#FF427B',
    },
    {
      light: '#f0efee',
      primary: '#E1DEDD',
      highlight: '#1B0E08',
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
