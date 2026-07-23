import { PropsWithChildren } from 'react';
import { ThemeProvider } from 'styled-components/native';

import { useAppSelector } from '@/redux';
import { getSelectedTheme } from '@/redux/slices';
import { themes } from '@/themes/Themes';
import { useBrandingRefresh } from '@/services';

import DevThemeToggle from './DevThemeToggle';

// NOTE: app/_layout.tsx's root App() component is not itself rendered
// under PersistGate — it *contains* PersistGate, and PersistGate (used
// there with plain JSX children, not a render-prop) renders nothing at all
// until redux-persist finishes rehydrating. AppThemeProvider is the first
// component in that children tree, so it only mounts post-rehydration.
// useBrandingRefresh is called here (rather than in App()) so its one-shot
// fetch-and-maybe-dispatch never races the persisted theme on cold start.
export default function AppThemeProvider({ children }: PropsWithChildren) {
  const name = useAppSelector(getSelectedTheme);
  useBrandingRefresh();

  return (
    <ThemeProvider theme={themes[name]}>
      {children}
      <DevThemeToggle />
    </ThemeProvider>
  );
}
