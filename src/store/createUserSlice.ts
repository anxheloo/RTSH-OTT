import { StateCreator } from 'zustand';

import type { User } from '@/types';
import { PARENTAL_PIN_KEY, REFRESH_TOKEN_KEY } from '@/config/auth';
import { removeFromKeychain } from '@/services/keychain';

import type { AppStore } from './useAppStore';

export interface UserSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
}

export const createUserSlice: StateCreator<AppStore, [], [], UserSlice> = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  // Hydrate the parental gate from the backend flag — a fresh device (no local
  // keychain cache) still knows a per-account PIN exists and gates accordingly.
  login: (user, token) =>
    set({ user, token, isAuthenticated: true, isPinSet: !!user.parentalPinSet }),

  logout: async () => {
    // Clear the per-account PIN cache too, so the next account on this device
    // doesn't inherit a stale local verifier.
    await removeFromKeychain(REFRESH_TOKEN_KEY);
    await removeFromKeychain(PARENTAL_PIN_KEY);
    set({ user: null, token: null, isAuthenticated: false, isPinSet: false });
  },
});
