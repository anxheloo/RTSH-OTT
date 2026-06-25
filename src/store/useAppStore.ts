import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage';

import { createModalSlice, ModalSlice } from './createModalSlice';
import { createNetworkSlice, NetworkSlice } from './createNetworkSlice';
import { createParentalSlice, ParentalSlice } from './createParentalSlice';
import { createPlayerSlice, PlayerSlice } from './createPlayerSlice';
import { createSettingsSlice, SettingsSlice } from './createSettingsSlice';
import { createThemeSlice, resolveColors, ThemeSlice } from './createThemeSlice';
import { createToastSlice, ToastSlice } from './createToastSlice';
import { createUserSlice, UserSlice } from './createUserSlice';
import { zustandStorage } from './storage';

export type AppStore = UserSlice &
  SettingsSlice &
  ThemeSlice &
  ModalSlice &
  NetworkSlice &
  PlayerSlice &
  ParentalSlice &
  ToastSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createUserSlice(...a),
      ...createSettingsSlice(...a),
      ...createThemeSlice(...a),
      ...createModalSlice(...a),
      ...createNetworkSlice(...a),
      ...createParentalSlice(...a),
      ...createToastSlice(...a),

      ...(createPlayerSlice as any)(...a),
    }),
    {
      name: STORAGE_KEYS.PERSIST,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        locale: state.locale,
        mode: state.mode,
        cellularPlaybackAllowed: state.cellularPlaybackAllowed,
        backgroundVideoAllowed: state.backgroundVideoAllowed,
        autoplayEnabled: state.autoplayEnabled,
        dataSaverEnabled: state.dataSaverEnabled,
        hapticsEnabled: state.hapticsEnabled,
        parentalEnabled: state.parentalEnabled,
        parentalPin: state.parentalPin,
        failedAttempts: state.failedAttempts,
        lockedUntil: state.lockedUntil,
      }),
      onRehydrateStorage: () => {
        console.log('[BOOT] store: rehydrate starting…');
        return (state, error) => {
          if (error) console.log('[BOOT] store: rehydrate ERROR', error);
          if (!state) return;
          state.colors = resolveColors(state.mode);
          console.log('[BOOT] store: rehydrate done OK');
        };
      },
    },
  ),
);
