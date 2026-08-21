import { StateCreator } from 'zustand';

import type { User } from '@/types';
import { clearMonitoringUser, setMonitoringUser } from '@/lib/monitoring';
import { clearRefreshToken } from '@/lib/tokenVault';

import type { AppStore } from './useAppStore';

export interface UserSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /**
   * A device-scoped session with no identity behind it (iOS only — see
   * `GUEST_MODE_ENABLED`). Deliberately NOT persisted: it is re-derived at boot
   * from whether the keychain holds a refresh token, so it can never drift out
   * of sync with the vault.
   */
  isGuest: boolean;
  /**
   * The guest access token, PERSISTED (MMKV) so a returning guest boots with no
   * network at all — the same offline-first boot a member gets.
   *
   * Deliberately MMKV and not the keychain: an anonymous token that opens only
   * free broadcast content is a weaker secret than the `parentalPin` hash that
   * already lives there (`/users/me`, `/packages` and `/auth/logout` all 403 for
   * it), and MMKV is SYNCHRONOUS — so the boot read adds no async step and no
   * new throw surface. `token` itself stays memory-only for members; this is the
   * only token that ever reaches disk.
   *
   * MUST be nulled by both `login` and `logout`: a leftover copy would be found
   * by the boot rehydrate and silently sign a signed-OUT user back in as a
   * guest — the same trap `tokenVault` documents for a non-remembered session.
   */
  guestToken: string | null;

  /** Universal partial setter for the user slice. */
  updateUserSlice: (state: Partial<UserSlice>) => void;
  login: (user: User, token: string) => void;
  setGuestSession: (token: string, deviceKey: string) => void;
  logout: () => Promise<void>;
}

/**
 * "There is a usable session" — signed in OR browsing as a guest. The ONLY
 * predicate that should gate app access; `isAuthenticated` keeps its narrower
 * meaning (a real, identified user) so every existing consumer of it stays
 * correct. On Android `isGuest` is unreachable, so this is identical to
 * `isAuthenticated` there.
 */
export const selectHasSession = (s: UserSlice): boolean => s.isAuthenticated || s.isGuest;

export const createUserSlice: StateCreator<AppStore, [], [], UserSlice> = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: false,
  guestToken: null,

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
    set({ user, token, isAuthenticated: true, isGuest: false, guestToken: null });
  },

  /**
   * Adopt a guest access token. Separate from `login` because a guest has no
   * user to attach and must not flip `isAuthenticated` — folding it in would
   * mean making `login` accept a null user, which is exactly the ambiguity this
   * design avoids. No refresh token: a guest token is re-minted on 401 rather
   * than refreshed (see `authRefresh.ts`).
   *
   * Sentry gets the DEVICE key, prefixed so it can never be confused with an
   * account id. Without an identity here, a crash loop on one guest device is
   * indistinguishable from the same crash on hundreds. The key is the same
   * non-PII value already sent in the login `device` object.
   */
  setGuestSession: (token, deviceKey) => {
    setMonitoringUser(`guest:${deviceKey}`);
    set({ user: null, token, isAuthenticated: false, isGuest: true, guestToken: token });
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
      isGuest: false,
      // Drop the persisted guest token with the session. Plain `set` on purpose:
      // it is synchronous and cannot throw, so it can never block the wipe the
      // way an awaited keychain delete could.
      guestToken: null,
      // Reset the persisted "continue as guest" choice too. Without this, signing
      // out lands on the login screen NOW but the next launch would silently
      // re-mint a guest session and skip it — two different answers to "am I
      // signed out?". Signing out means the welcome gate is shown again.
      guestChosen: false,
      failedAttempts: 0,
      lockedUntil: null,
    });
  },
});
