import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/providers/SettingsProvider';
import {
  darkColors,
  elevation,
  lightColors,
  radius,
  spacing,
  typography,
  type ThemeColors,
} from './tokens';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
  isDark: boolean;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();

  const scheme: 'light' | 'dark' = useMemo(() => {
    if (settings.theme === 'light') return 'light';
    if (settings.theme === 'dark') return 'dark';
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [settings.theme, systemScheme]);

  const value = useMemo<Theme>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      elevation,
      isDark: scheme === 'dark',
      scheme,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return theme;
}
