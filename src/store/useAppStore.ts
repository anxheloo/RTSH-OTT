import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { darkTheme, lightTheme } from '@/theme/colors';
import { STORAGE_KEYS } from '@/constants/storage';

import { createModalSlice, ModalSlice } from './createModalSlice';
import { createSettingsSlice, SettingsSlice } from './createSettingsSlice';
import { createThemeSlice, ThemeSlice } from './createThemeSlice';
import { createUserSlice, UserSlice } from './createUserSlice';
import { zustandStorage } from './storage';

export type AppStore = UserSlice & SettingsSlice & ThemeSlice & ModalSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createUserSlice(...a),
      ...createSettingsSlice(...a),
      ...createThemeSlice(...a),
      ...createModalSlice(...a),
    }),
    {
      name: STORAGE_KEYS.PERSIST,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        locale: state.locale,
        tcAcceptedAt: state.tcAcceptedAt,
        mode: state.mode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.mode === 'light') state.colors = lightTheme;
        else if (state.mode === 'dark') state.colors = darkTheme;
      },
    },
  ),
);
