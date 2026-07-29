import { StateCreator } from 'zustand';

import type { User } from '@/types';
import { clearMonitoringUser, setMonitoringUser } from '@/lib/monitoring';
import { clearRefreshToken } from '@/lib/tokenVault';

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
  //
  // Sentry identity rides this single chokepoint on purpose. Attaching the
  // opaque account id is what lets Sentry distinguish "one user hit this 400
  // times" from "400 users hit it once" — the difference between a nuisance and
  // an outage. Id only, never the email (see `lib/monitoring.ts`).
  login: (user, token) => {
    setMonitoringUser(user.id);
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    // Clear the identity with the session. A shared device — the living-room
    // STB is the obvious case — would otherwise attribute the next person's
    // crashes to whoever signed in last.
    clearMonitoringUser();
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
