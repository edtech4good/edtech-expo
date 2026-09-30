import { Platform, ViewStyle } from 'react-native';

// The mockups' two shadows: --raised (a movable tile at rest) and --lifted
// (a tile being dragged). The shadow colour is the theme's ink (#09101D at
// low alpha), written as one rgba because RN needs a colour per platform.
export const RAISED = Platform.select<ViewStyle>({
  web: {
    boxShadow: '0 1px 2px rgba(9,16,29,0.06), 0 2px 6px rgba(9,16,29,0.06)',
  } as ViewStyle,
  android: { elevation: 2 },
  default: {
    shadowColor: 'rgb(9,16,29)',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
}) as ViewStyle;

export const LIFTED = Platform.select<ViewStyle>({
  web: { boxShadow: '0 12px 28px rgba(9,16,29,0.18)' } as ViewStyle,
  android: { elevation: 12 },
  default: {
    shadowColor: 'rgb(9,16,29)',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
  },
}) as ViewStyle;

export const FLAT = Platform.select<ViewStyle>({
  web: { boxShadow: 'none' } as ViewStyle,
  default: { elevation: 0, shadowOpacity: 0 },
}) as ViewStyle;
