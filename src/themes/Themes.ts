import { DefaultTheme } from 'styled-components/native';

import { Colors, Metrics } from '.';

const { breakpoints, fontSizes, layouts, icons, lineHeights, fontWeights } =
  Metrics;

const appTheme: DefaultTheme = {
  breakpoints,
  colors: Colors,
  fontSizes,
  fontWeights,
  layouts,
  icons,
  lineHeights,
};

export { appTheme };
