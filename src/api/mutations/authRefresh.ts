import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { getFromKeychain, removeFromKeychain, storeOnKeychain } from '@/services/keychain';

import { registerRefreshHandler } from '../client';
import * as authService from '../services/auth';

/**
 * Exchange the refresh token in keychain for a new access token. On success,
 * rotates both tokens (refresh → keychain, access → store) and returns the new
 * access token. On failure or missing refresh token, clears keychain and
 * returns null.
 *
 * Used both by:
 *   - The 401 interceptor (via `setupAuthRefresh()`)
 *   - App bootstrap (via `useCheckToken`) to proactively hydrate on launch
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getFromKeychain(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
    await storeOnKeychain(REFRESH_TOKEN_KEY, newRefreshToken);
    useAppStore.getState().login(user, accessToken);
    return accessToken;
  } catch {
    await removeFromKeychain(REFRESH_TOKEN_KEY);
    return null;
  }
}

/** Call once at app bootstrap to wire 401 → refresh into the api client. */
export function setupAuthRefresh(): void {
  registerRefreshHandler(refreshAccessToken);
}
