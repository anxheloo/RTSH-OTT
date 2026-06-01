import { Appearance } from 'react-native';

import { StateCreator } from 'zustand';

import { darkTheme, lightTheme, ThemeColors } from '@/theme/colors';

import type { AppStore } from './useAppStore';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSlice {
  mode: ThemeMode;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const resolveColors = (mode: ThemeMode): ThemeColors => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark' ? darkTheme : lightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
};

export const createThemeSlice: StateCreator<AppStore, [], [], ThemeSlice> = (set, get) => ({
  mode: 'system',
  colors: resolveColors('system'),

  setTheme: (mode) => {
    set({ mode, colors: resolveColors(mode) });
  },

  toggleTheme: () => {
    const current = get().mode;
    const next: ThemeMode = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    set({ mode: next, colors: resolveColors(next) });
  },
});
