import { StateCreator } from 'zustand';

import type { User } from '@/types';
import { clearRefreshToken } from '@/services/tokenVault';

import type { AppStore } from './useAppStore';

export interface UserSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  /** Universal partial setter for the user slice. */
  updateUserSlice: (state: Partial<UserSlice>) => void;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
}

export const createUserSlice: StateCreator<AppStore, [], [], UserSlice> = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  updateUserSlice: (state) => set(state),

  // The parental gate is device-level (see `ParentalSlice`), independent of the
  // account, so login/logout never touch it.
  login: (user, token) => set({ user, token, isAuthenticated: true }),

  logout: async () => {
    await clearRefreshToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      failedAttempts: 0,
      lockedUntil: null,
    });
  },
});
