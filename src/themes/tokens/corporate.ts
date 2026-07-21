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

  background: '#FFF9EE',
  onBackground: '#09101D',

  surface: '#FFFFFF',
  onSurface: '#2B3A4B',

  surfaceVariant: '#F4F6F9',
  onSurfaceVariant: '#5A6B80',

  outline: '#CDD5E0',
  divider: '#E3E8EF',
  placeholder: '#94A3B8',
  shadow: 'rgba(9,16,29,0.05)',
  error: '#FF640D',
  customAppBar: '#FFF9EE',
  customHeaderTitle: '#09101D',

  selection: '#06AFBC',
  success: '#22DB8D',
  warning: '#FFC228',
  warningText: '#B8860B',
  lessonChip: '#2AAADD',
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
      primary: '#FFF6DE',
      highlight: '#B8860B',
    },
    {
      light: '#FFFFFF',
      primary: '#FFEFE3',
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
};

export default corporateTokens;
