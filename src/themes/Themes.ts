import { DefaultTheme } from 'styled-components/native';

import { Metrics } from '.';
import kidsTokens from './tokens/kids';
import corporateTokens from './tokens/corporate';

const { breakpoints, fontSizes, layouts, icons, lineHeights, fontWeights } =
  Metrics;

const sharedMetrics = {
  breakpoints,
  fontSizes,
  fontWeights,
  layouts,
  icons,
  lineHeights,
};

const kidsTheme: DefaultTheme = {
  ...sharedMetrics,
  name: kidsTokens.name,
  colors: kidsTokens.colors,
  fonts: kidsTokens.fonts,
  radii: kidsTokens.radii,
  shadows: kidsTokens.shadows,
};

const corporateTheme: DefaultTheme = {
  ...sharedMetrics,
  name: corporateTokens.name,
  colors: corporateTokens.colors,
  fonts: corporateTokens.fonts,
  radii: corporateTokens.radii,
  shadows: corporateTokens.shadows,
};

const themes = { kids: kidsTheme, corporate: corporateTheme };
type ThemeName = keyof typeof themes;

// Backward-compat alias: pre-dual-theme code imported `appTheme` and always
// got the (only) kids palette.
const appTheme: DefaultTheme = kidsTheme;

export { themes, kidsTheme, corporateTheme, appTheme };
export type { ThemeName };
