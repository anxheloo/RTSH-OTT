/**
 * ParentalSlice — DEVICE-LEVEL parental gate (2026-06-16). The PIN is content
 * gating, not a credential, and by product decision it's handled entirely on the
 * client: never sent to or read from the backend, never attached to the user
 * object. It lives here and is persisted to MMKV (see `useAppStore` partialize),
 * so it survives logout/login and belongs to the device, not the account.
 *
 * Fields: the config (`parentalEnabled` + `parentalPin`) and the lockout UX
 * state (failed-attempt count + lockout timestamp). Verification is a local
 * compare against `parentalPin` (no network on any check).
 */
import { StateCreator } from 'zustand';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface ParentalSlice {
  /** Gate is on → adult-flagged content requires the PIN. */
  parentalEnabled: boolean;
  /** The device PIN. `null` until the user sets one. */
  parentalPin: string | null;
  failedAttempts: number;
  lockedUntil: number | null;

  /**
   * Single source of truth for the device parental config. Setting a `pin`
   * implicitly stores it; toggling `enabled` keeps the existing PIN so re-enable
   * needs no re-entry.
   */
  setParentalConfig: (partial: { enabled?: boolean; pin?: string }) => void;
  recordFailedAttempt: () => void;
  resetAttempts: () => void;
  isLocked: () => boolean;
  lockoutSecondsRemaining: () => number;
}

export const createParentalSlice: StateCreator<ParentalSlice, [], [], ParentalSlice> = (
  set,
  get,
) => ({
  parentalEnabled: false,
  parentalPin: null,
  failedAttempts: 0,
  lockedUntil: null,

  setParentalConfig: (partial) =>
    set((s) => ({
      parentalEnabled: partial.enabled ?? s.parentalEnabled,
      parentalPin: partial.pin ?? s.parentalPin,
    })),

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
