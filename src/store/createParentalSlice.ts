/**
 * ParentalSlice — runtime state for the parental-PIN gate.
 * The PIN hash + salt live ONLY in keychain (never in MMKV or this slice).
 * This slice tracks: whether a PIN is set, failed-attempt count, and lockout timestamp.
 */
import { StateCreator } from 'zustand';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface ParentalSlice {
  isPinSet: boolean;
  failedAttempts: number;
  lockedUntil: number | null;

  setIsPinSet: (v: boolean) => void;
  recordFailedAttempt: () => void;
  resetAttempts: () => void;
  isLocked: () => boolean;
  lockoutSecondsRemaining: () => number;
}

export const createParentalSlice: StateCreator<ParentalSlice, [], [], ParentalSlice> = (
  set,
  get,
) => ({
  isPinSet: false,
  failedAttempts: 0,
  lockedUntil: null,

  setIsPinSet: (v) => set({ isPinSet: v }),

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
