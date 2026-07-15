import axios from 'axios';

import { useAppStore } from '@/store/useAppStore';
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

/** Call once at app bootstrap to wire 401 → refresh into the api client. */
export function setupAuthRefresh(): void {
  registerRefreshHandler(refreshAccessToken);
}
