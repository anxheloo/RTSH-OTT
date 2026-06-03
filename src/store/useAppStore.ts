import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage';

import { createModalSlice, ModalSlice } from './createModalSlice';
import { createParentalSlice, ParentalSlice } from './createParentalSlice';
import { createPlayerSlice, PlayerSlice } from './createPlayerSlice';
import { createSettingsSlice, SettingsSlice } from './createSettingsSlice';
import { createThemeSlice, resolveColors, ThemeSlice } from './createThemeSlice';
import { createUserSlice, UserSlice } from './createUserSlice';
import { zustandStorage } from './storage';

export type AppStore = UserSlice & SettingsSlice & ThemeSlice & ModalSlice & PlayerSlice & ParentalSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createUserSlice(...a),
      ...createSettingsSlice(...a),
      ...createThemeSlice(...a),
      ...createModalSlice(...a),
      ...createParentalSlice(...a),
       
      ...(createPlayerSlice as any)(...a),
    }),
    {
      name: STORAGE_KEYS.PERSIST,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        locale: state.locale,
        tcAcceptedAt: state.tcAcceptedAt,
        mode: state.mode,
        cellularPlaybackAllowed: state.cellularPlaybackAllowed,
        backgroundVideoAllowed: state.backgroundVideoAllowed,
        autoplayEnabled: state.autoplayEnabled,
        dataSaverEnabled: state.dataSaverEnabled,
        hapticsEnabled: state.hapticsEnabled,
        isPinSet: state.isPinSet,
        failedAttempts: state.failedAttempts,
        lockedUntil: state.lockedUntil,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.colors = resolveColors(state.mode);
      },
    },
  ),
);
