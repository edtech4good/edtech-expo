import { fontWeights } from '@/constants';
import 'styled-components/native';

export interface FontWeight {
  normal;
  semi;
  bold;
}

declare module 'styled-components/native' {
  export interface DefaultTheme {
    breakpoints: {
      DESKTOP_MIN_WIDTH: number;
      TABLET_MAX_WIDTH: number;
      TABLET_MIN_WIDTH: number;
      MOBILE_MAX_WIDTH: number;
      MOBILE_MIN_WIDTH: number;
      DEFAULT_MIN_WIDTH: number;
      DRAWER_LABEL_MIN_WIDTH: number;
      DRAWER_ROW_MIN_WIDTH: number;
    };
    colors: {
      primary: string;
      primaryLight: string;
      primaryDark: string;
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

      cards: Array<{ light: string; primary: string; highlight: string }>;
    };

    fontSizes: {
      // header: number;
      // title: number;
      // subtitle: number;
      // body: number;
      // button: number;
      // caption: number;
      // overline: number;
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
      button: number;
      sh3: number;
    };

    fontWeights: {
      // header: string | number;
      // title: string | number;
      // subtitle: string | number;
      // body: string | number;
      // button: string | number;
      // caption: string | number;
      // overline: string | number;
      h1: keyof typeof fontWeights;
      h2: keyof typeof fontWeights;
      h3: keyof typeof fontWeights;
      h4: keyof typeof fontWeights;
      h5: keyof typeof fontWeights;
      h6: keyof typeof fontWeights;
      button: keyof typeof fontWeights;
      sh3: keyof typeof fontWeights;
    };

    lineHeights: {
      // header: number;
      // title: number;
      // subtitle: number;
      // body: number;
      // button: number;
      // caption: number;
      // overline: number;
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
      button: number;
      sh3: number;
    };

    icons: {
      drawerIconOnly: number;
      drawerColumnIcon: number;
      drawerRowIcon: number;
    };

    // images: {
    //   defaultSize: number;
    // };

    layouts: {
      pageHorizontalPadding: number;
      pageVerticalPadding: number;

      divider: number;

      defaultRadius: number;
      searchBoxRadius: number;
      searchBoxSize: number;
      defaultComponentSize: number;
      buttonSize: number;

      tiny: number;
      small: number;
      medium: number;
      large: number;

      drawerMinWidth: number;
      drawerMaxWidth: number;
    };
  }
}
