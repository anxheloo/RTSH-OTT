import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { getFromKeychain } from '@/services/keychain';

/**
 * Boot-time auth check. Reads ONLY the keychain — no network — so the splash
 * gate resolves instantly even when the device is offline or on a slow
 * connection.
 *
 * Authentication is treated as a local-first signal: if the keychain holds a
 * refresh token AND the persisted store still has a `user`, the session is
 * considered live. The actual access-token refresh is performed in the
 * background by `useBootstrap` (fire-and-forget) so it never blocks first
 * paint. If the background refresh fails with 401/403, `refreshAccessToken`
 * will call `store.logout()` and the user is routed back to `(auth)`.
 *
 * Trade-off: between mount and the background refresh completing, the store
 * has `isAuthenticated: true` but `token: null`. The first real query will go
 * without `Authorization`, hit 401, and the interceptor will refresh-then-retry.
 * One wasted round-trip per cold boot — acceptable in exchange for instant
 * offline boot.
 */
export function useCheckToken() {
  return useQuery({
    queryKey: ['auth', 'init'],
    queryFn: async () => {
      const refreshToken = await getFromKeychain(REFRESH_TOKEN_KEY);
      const persistedUser = useAppStore.getState().user;
      const authenticated = Boolean(refreshToken && persistedUser);
      if (authenticated) {
        useAppStore.setState({ isAuthenticated: true });
      }
      return { authenticated };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
