import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { refreshAccessToken } from '@/api/mutations/authRefresh';
import { getMe } from '@/api/services/users';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { getFromKeychain } from '@/services/keychain';

/**
 * Boot-time auth check. Reads the keychain first — no network on the common
 * path — so the splash gate resolves instantly even when the device is offline.
 *
 * Three boot states:
 *
 *   1. **No refresh token** → unauthenticated. Route to `(auth)`.
 *   2. **Token + persisted user** → authenticated immediately (offline-first
 *      fast path). The actual access-token refresh happens in the background
 *      (`useBootstrap`, fire-and-forget) so it never blocks first paint. Between
 *      mount and that refresh, the store has `isAuthenticated: true` but
 *      `token: null`; the first real query 401s and the interceptor
 *      refresh-then-retries. One wasted round-trip — acceptable for instant boot.
 *   3. **Token but NO persisted user** → manual-data-wipe recovery. MMKV was
 *      cleared (e.g. iOS "Clear data" / reinstall) but the keychain refresh
 *      token survived. We can't authenticate without the user, so this path
 *      hydrates over the network *before* resolving: `refreshAccessToken()`
 *      (whose response already carries the user) → falling back to `GET
 *      /users/me` if the refresh response lacked one. Splash waits only in this
 *      rare case; if offline/rejected, we fall through to `(auth)`.
 *
 * On 401/403 `refreshAccessToken` wipes the keychain and logs out; transient
 * network/5xx errors leave the token intact so the next boot can retry.
 */
export function useCheckToken() {
  return useQuery({
    queryKey: ['auth', 'init'],
    queryFn: async () => {
      const refreshToken = await getFromKeychain(REFRESH_TOKEN_KEY);
      if (!refreshToken) return { authenticated: false };

      // Fast path: token + user already in the persisted store.
      if (useAppStore.getState().user) {
        useAppStore.setState({ isAuthenticated: true });
        return { authenticated: true };
      }

      // Manual-data-wipe recovery: token present, user gone → hydrate over network.
      const accessToken = await refreshAccessToken();
      if (!accessToken) return { authenticated: false };

      // refreshAccessToken already calls store.login() with the user from the
      // refresh response; only hit /users/me if that response lacked a user.
      if (!useAppStore.getState().user) {
        try {
          const user = await getMe();
          useAppStore.getState().login(user, accessToken);
        } catch {
          return { authenticated: false };
        }
      }

      return { authenticated: Boolean(useAppStore.getState().user) };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
