import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';

import { getMe } from '../services/users';

/**
 * Fetches the user profile once on app open and keeps it in the store for the
 * session. With global staleTime: Infinity the query never auto-refetches —
 * explicit invalidation (pull-to-refresh, re-launch) is the only refresh path.
 * Mount once in `useBootstrap`.
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
  });
}
