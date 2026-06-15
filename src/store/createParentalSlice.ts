/**
 * ParentalSlice — client-only UX state for the parental gate: failed-attempt
 * count + lockout timestamp. Whether a PIN exists (and the PIN itself) lives on
 * `user.parentalPin` (see `createUserSlice`), so this slice holds no PIN data.
 */
import { StateCreator } from 'zustand';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface ParentalSlice {
  failedAttempts: number;
  lockedUntil: number | null;

  recordFailedAttempt: () => void;
  resetAttempts: () => void;
  isLocked: () => boolean;
  lockoutSecondsRemaining: () => number;
}

export const createParentalSlice: StateCreator<ParentalSlice, [], [], ParentalSlice> = (
  set,
  get,
) => ({
  failedAttempts: 0,
  lockedUntil: null,

  recordFailedAttempt: () =>
    set((s) => {
      const next = s.failedAttempts + 1;
      return {
        failedAttempts: next,
        lockedUntil: next >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : s.lockedUntil,
      };
    }),

  resetAttempts: () => set({ failedAttempts: 0, lockedUntil: null }),

  isLocked: () => {
    const { lockedUntil } = get();
    if (!lockedUntil) return false;
    if (Date.now() < lockedUntil) return true;
    set({ lockedUntil: null, failedAttempts: 0 });
    return false;
  },

  lockoutSecondsRemaining: () => {
    const { lockedUntil } = get();
    if (!lockedUntil) return 0;
    return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  },
});
