import { StateCreator } from 'zustand';

import type { ParentalPin, User } from '@/types';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { removeFromKeychain } from '@/services/keychain';

import type { AppStore } from './useAppStore';

export interface UserSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  /** Universal partial setter (e.g. patching `user.parentalPin` after setup). */
  updateUserSlice: (state: Partial<UserSlice>) => void;
  login: (user: User, token: string) => void;
  /**
   * Single source of truth for mutating `user.parentalPin`. Used by the
   * parental mutations' `onSuccess` (setup / toggle) so the nested merge lives
   * in exactly one place. No-op when there's no signed-in user.
   */
  setParentalConfig: (partial: Partial<ParentalPin>) => void;
  logout: () => Promise<void>;
}

export const createUserSlice: StateCreator<AppStore, [], [], UserSlice> = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  updateUserSlice: (state) => set(state),

  setParentalConfig: (partial) =>
    set((s) => {
      if (!s.user) return s;
      const current: ParentalPin = s.user.parentalPin ?? { enabled: false, pin: null };
      return { user: { ...s.user, parentalPin: { ...current, ...partial } } };
    }),

  // The parental gate hydrates from `user.parentalPin` (carried on the user
  // object + persisted), so there's nothing extra to seed here.
  login: (user, token) => set({ user, token, isAuthenticated: true }),

  logout: async () => {
    await removeFromKeychain(REFRESH_TOKEN_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      failedAttempts: 0,
      lockedUntil: null,
    });
  },
});
