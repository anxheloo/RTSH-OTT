import axios from 'axios';

import { useAppStore } from '@/store/useAppStore';
import i18n from '@/i18n';
import { getRefreshToken } from '@/services/tokenVault';

import { registerRefreshHandler } from '../client';
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
        await useAppStore.getState().logout();
        // Tell the user why they were bounced to login — this is the only path
        // that logs out from a *failed refresh* (user-initiated logout is
        // silent). No explicit button: `notify` defaults to an OK that closes.
        useAppStore.getState().updateModalSlice({
          currentModal: 'notify',
          modalData: {
            title: i18n.t('errors.session_expired'),
            description: i18n.t('errors.session_expired_body'),
          },
        });
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
