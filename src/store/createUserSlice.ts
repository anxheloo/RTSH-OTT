import { StateCreator } from 'zustand';

import type { User } from '@/types';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
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

  login: (user, token) => set({ user, token, isAuthenticated: true }),

  logout: async () => {
    await removeFromKeychain(REFRESH_TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },
});
