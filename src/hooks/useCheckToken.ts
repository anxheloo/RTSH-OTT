import { useQuery } from '@tanstack/react-query';

import { refreshAccessToken } from '@/api/mutations/authRefresh';

/**
 * Bootstrap auth check. On app launch, proactively exchanges the keychain
 * refresh token for a fresh access token (hydrates the store). Resolves with
 * the auth result so the navigator can route accordingly.
 *
 * Store is the source of truth post-resolution — consumers can read
 * `isAuthenticated` from `useAppStore`. This hook just exposes loading state.
 */
export function useCheckToken() {
  return useQuery({
    queryKey: ['auth', 'init'],
    queryFn: async () => {
      const accessToken = await refreshAccessToken();
      return { authenticated: accessToken !== null };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
