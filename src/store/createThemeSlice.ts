import { StateCreator } from 'zustand';

import { darkTheme, lightTheme, ThemeColors } from '@/theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSlice {
  mode: ThemeMode;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode, systemScheme?: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const resolveColors = (mode: ThemeMode, systemScheme?: 'light' | 'dark'): ThemeColors => {
  if (mode === 'system') {
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
};

export const createThemeSlice: StateCreator<ThemeSlice> = (set, get) => ({
  mode: 'system',
  colors: lightTheme,

  setTheme: (mode, systemScheme) => {
    set({ mode, colors: resolveColors(mode, systemScheme) });
  },

  toggleTheme: () => {
    const current = get().mode;
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
    set({ mode: next, colors: next === 'dark' ? darkTheme : lightTheme });
  },
});
