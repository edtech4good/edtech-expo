import { Dimensions } from 'react-native';

const dimensions = Dimensions.get('window');

const { height, width } = dimensions;

const breakpoints = {
  DESKTOP_MIN_WIDTH: 1281,
  TABLET_MAX_WIDTH: 1280,
  TABLET_MIN_WIDTH: 921,
  PHABLET_MAX_WIDTH: 920,
  PHABLET_MIN_WIDTH: 768,
  MOBILE_MAX_WIDTH: 767,
  MOBILE_MIN_WIDTH: 430,
  DEFAULT_MIN_WIDTH: 768,

  DRAWER_LABEL_MIN_WIDTH: 110,
  DRAWER_ROW_MIN_WIDTH: 142,
};

const fontSizes = {
  // header: 28,
  // title: 20,
  // subtitle: 18,
  // body: 16,
  // button: 18,
  // caption: 14,
  // overline: 12,
  // ===========
  h1: 64,
  h2: 40,
  h3: 36,
  h4: 28,
  h5: 24,
  h6: 20,
  button: 18,
  sh3: 14,
};

const fontWeights: any = {
  h1: 'bold' as keyof typeof fontWeights,
  h2: 'semi' as keyof typeof fontWeights,
  h3: 'semi' as keyof typeof fontWeights,
  h4: 'normal' as keyof typeof fontWeights,
  h5: 'normal' as keyof typeof fontWeights,
  h6: 'normal' as keyof typeof fontWeights,
  button: 'semi' as keyof typeof fontWeights,
  sh3: 'semi' as keyof typeof fontWeights,
};

export const lineHeights = {
  // header: 28,
  // title: 20,
  // subtitle: 28,
  // body: 24,
  // button: 24,
  // caption: 22,
  // overline: 20,
  // ===========
  h1: 80,
  h2: 56,
  h3: 48,
  h4: 40,
  h5: 32,
  h6: 24,
  button: 24,
  sh3: 24,
};

export const icons = {
  drawerIconOnly: 32,
  drawerColumnIcon: 24,
  drawerRowIcon: 18,
};

export const layouts = {
  pageHorizontalPadding: 16,
  pageVerticalPadding: 8,

  divider: 2,

  defaultRadius: 8,
  searchBoxRadius: 8,
  searchBoxSize: 46,
  defaultComponentSize: 64,
  buttonSize: 50,

  tiny: 4,
  small: 8,
  medium: 12,
  large: 16,

  drawerMinWidth: 64.5,
  drawerMaxWidth: 215,
};

const AppMetrics = {
  height,
  width,
  breakpoints,
  fontSizes,
  fontWeights,
  lineHeights,
  layouts,
  icons,
};

export default AppMetrics;
