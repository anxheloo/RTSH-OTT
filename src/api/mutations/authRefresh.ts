import axios from 'axios';

import { useAppStore } from '@/store/useAppStore';
import { mintGuestSession } from '@/features/auth/guestSession';
import { getRefreshToken } from '@/lib/tokenVault';

import { forceSessionExpired, registerRefreshHandler } from '../client';
import * as authService from '../services/auth';

let inflight: Promise<string | null> | null = null;

/**
 * Exchange the keychain refresh token for a new access token. The refresh
 * token is static (no rotation — backend decision 2026-06-12) and the response
 * carries no user, so on success only the in-memory access token is updated;
 * `isAuthenticated` stays whatever the boot/login flow set it to.
 *
 * Single-flighted at this layer so every caller shares one in-flight request —
 * concurrent refreshes would be logout bugs the day the backend switches to
 * rotating tokens.
 *
 * Only confirmed auth failures (401/403) clear the keychain — transient
 * network errors (offline, 5xx) bubble up as null without wiping the token,
 * so the user stays logged in across flaky connectivity. Logout fires HERE
 * and only here; callers must treat null as "no token this attempt", never
 * as a logout signal.
 *
 * Used by the 401 interceptor (via `setupAuthRefresh()`): on a cold boot the
 * access token is null, so the first authed request 401s and is refreshed +
 * retried here — no proactive boot refresh needed.
 */
export function refreshAccessToken(): Promise<string | null> {
  // A refresh is already in flight — share it instead of firing a duplicate.
  if (!inflight) {
    inflight = doRefresh().finally(() => {
      inflight = null; // reset so the next refresh starts a fresh request
    });
  }
  return inflight;
}

async function doRefresh(): Promise<string | null> {
  // A guest holds no refresh token by design, so there is nothing to exchange —
  // mint a replacement instead. Same single-flight, same retry-once contract in
  // the interceptor; only the source of the new token differs.
  if (useAppStore.getState().isGuest) return remintGuest();

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { accessToken } = await authService.refresh(refreshToken);
    useAppStore.setState({ token: accessToken });
    return accessToken;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        // Shared with the 400 `playback.device_class_required` teardown in
        // `client.ts` (extracted 2026-07-14, device-identity migration) — both
        // are "this token can never work again" cases: wipe locally, clear
        // cached server data, tell the user why via the one-time notify.
        await forceSessionExpired();
        return null;
      }
    }
    // Transient (network/timeout/5xx): caller treats as unauthenticated this
    // attempt, but token stays so the next attempt can succeed.
    return null;
  }
}

/**
 * Re-mint a guest access token after a 401.
 *
 * Failure semantics mirror the member path deliberately: a confirmed auth
 * failure (401/403 — the backend's `auth.guest_disabled` kill switch, or a
 * rejected device) means the guest path is closed and cannot recover, so the
 * session is torn down and the root guard routes to the auth stack. Anything
 * else (offline, timeout, 5xx, or a `429` from the shared-IP mint limit) is
 * transient: `mintGuestSession` has already retried with backoff, and this
 * returns null WITHOUT tearing down — a flaky network, or a crowd behind one
 * carrier NAT, must not eject someone mid-programme. The next request retries.
 *
 * No `forceSessionExpired()` here: that clears the query cache and raises a
 * "your session expired" notice, both of which are wrong for a guest who never
 * had a session to expire.
 */
async function remintGuest(): Promise<string | null> {
  try {
    const { accessToken, deviceKey } = await mintGuestSession();
    useAppStore.getState().setGuestSession(accessToken, deviceKey);
    return accessToken;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        await useAppStore.getState().logout();
        return null;
      }
    }
    return null;
  }
}

/** Call once at app bootstrap to wire 401 → refresh into the api client. */
export function setupAuthRefresh(): void {
  registerRefreshHandler(refreshAccessToken);
}
