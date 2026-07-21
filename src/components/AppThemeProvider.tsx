import { PropsWithChildren } from 'react';
import { ThemeProvider } from 'styled-components/native';

import { useAppSelector } from '@/redux';
import { getSelectedTheme } from '@/redux/slices';
import { themes } from '@/themes/Themes';

import DevThemeToggle from './DevThemeToggle';

export default function AppThemeProvider({ children }: PropsWithChildren) {
  const name = useAppSelector(getSelectedTheme);

  return (
    <ThemeProvider theme={themes[name]}>
      {children}
      <DevThemeToggle />
    </ThemeProvider>
  );
}
