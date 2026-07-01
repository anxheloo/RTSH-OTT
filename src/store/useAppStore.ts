import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage';

import { createModalSlice, ModalSlice } from './createModalSlice';
import { createNetworkSlice, NetworkSlice } from './createNetworkSlice';
import { createParentalSlice, ParentalSlice } from './createParentalSlice';
import { createPlayerSlice, PlayerSlice } from './createPlayerSlice';
import { createRealtimeSlice, RealtimeSlice } from './createRealtimeSlice';
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
  ToastSlice &
  RealtimeSlice;

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
      ...createRealtimeSlice(...a),
      ...createPlayerSlice(...a),
    }),
    {
      name: STORAGE_KEYS.PERSIST,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        locale: state.locale,
        mode: state.mode,
        cellularPlaybackAllowed: state.cellularPlaybackAllowed,
        autoplayEnabled: state.autoplayEnabled,
        dataSaverEnabled: state.dataSaverEnabled,
        hapticsEnabled: state.hapticsEnabled,
        analyticsEnabled: state.analyticsEnabled,
        rememberMe: state.rememberMe,
        parentalEnabled: state.parentalEnabled,
        parentalPin: state.parentalPin,
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
