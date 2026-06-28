import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';

import { getMe } from '../services/users';

/**
 * Fetches the user profile ONCE per authenticated session and keeps it in the
 * store. Overrides the global 5-min/refetch-on-focus defaults with
 * `staleTime: Infinity` + focus/reconnect refetch off, so the only refresh path
 * is explicit `queryClient.invalidateQueries({ queryKey: ['me'] })` — fire that
 * from any mutation that changes the user's profile. Mount once in
 * `(app)/_layout.tsx`; `enabled` flips true on auth → exactly one fetch.
 *
 * Trade-off: this drops the cross-device foreground profile sync — a profile
 * change made on another device no longer auto-arrives on foreground; it lands
 * only on next cold boot or after a local invalidation.
 */
export function useMeQuery() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await getMe();
      useAppStore.getState().updateUserSlice({ user });
      return user;
    },
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
