import type { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { appTheme } from './theme';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={appTheme}>{children}</ThemeProvider>;
}
