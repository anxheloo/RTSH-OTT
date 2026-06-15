/**
 * Stateful mock for per-account parental control (2026-06-15). The PIN is
 * content gating, not a credential, so the backend keeps it on the user object
 * (`user.parentalPin = { enabled, pin }`); this stand-in mirrors that —
 * `POST` creates + enables, `PATCH` toggles `enabled` (and later changes the
 * PIN via `newPin`). `getMockParental()` is stamped onto every user payload so
 * `/users/me` and login reflect the live state. Resets on reload (in-memory).
 */
import type { ParentalPin } from '@/types';

let state: ParentalPin | null = null;

/** First-time setup (`POST /parental { enabled, pin }`). */
export function setMockParentalPin(pin: string | undefined): void {
  state = pin ? { enabled: true, pin } : null;
}

/** Enable/disable toggle + future change-PIN (`PATCH /parental { enabled, newPin? }`). */
export function updateMockParental(patch: { enabled?: boolean; newPin?: string }): void {
  if (!state) return;
  state = {
    enabled: patch.enabled ?? state.enabled,
    pin: patch.newPin ?? state.pin,
  };
}

/** `ParentalDTO` on the user object — `null` until first configured. */
export function getMockParental(): ParentalPin | null {
  return state;
}
