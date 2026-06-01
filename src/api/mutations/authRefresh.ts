import axios from 'axios';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { getFromKeychain, storeOnKeychain } from '@/services/keychain';

import { registerRefreshHandler } from '../client';
import * as authService from '../services/auth';

/**
 * Exchange the keychain refresh token for a new access token. On success,
 * rotates both tokens (refresh → keychain, access → store). Returns the new
 * access token, or null if there's no refresh token or the server rejected it.
 *
 * Only confirmed auth failures (401/403) clear the keychain — transient
 * network errors (offline, 5xx) bubble up as null without wiping the token,
 * so the user stays logged in across flaky connectivity.
 *
 * Used by:
 *   - The 401 interceptor (via `setupAuthRefresh()`)
 *   - App bootstrap (via `useCheckToken`) to hydrate on launch
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getFromKeychain(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
    await storeOnKeychain(REFRESH_TOKEN_KEY, newRefreshToken);
    useAppStore.getState().login(user, accessToken);
    return accessToken;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        await useAppStore.getState().logout();
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
