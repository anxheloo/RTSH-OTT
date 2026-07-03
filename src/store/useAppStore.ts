import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/types';
import { STORAGE_KEYS } from '@/constants/storage';

import { AdsSlice, createAdsSlice } from './createAdsSlice';
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
  RealtimeSlice &
  AdsSlice;

/**
 * Explicit whitelist of the `user` fields that persist to the plaintext MMKV
 * blob (5.X.17). MMKV is deliberately unencrypted (accepted risk — see
 * ARCHITECTURE → Persistence boundaries), so the guard is this list: a future
 * sensitive field added to `User` (a token, a verification secret) can never
 * silently land on disk — it must be added here on purpose.
 */
const persistUser = (user: User | null): User | null =>
  user && {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
    age: user.age,
    location: user.location,
    gender: user.gender,
    educationLevel: user.educationLevel,
    avatarUrl: user.avatarUrl,
    subscription: user.subscription,
  };

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
      ...createAdsSlice(...a),
    }),
    {
      name: STORAGE_KEYS.PERSIST,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: persistUser(state.user),
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
