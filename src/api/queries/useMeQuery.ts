import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';

import { getMe } from '../services/users';

/** How often the active app pulls a fresh profile (cross-device sync cadence). */
const ME_REFETCH_INTERVAL_MS = 5 * 60_000;

/**
 * Keeps the persisted `user` in sync with the backend across devices WITHOUT
 * sockets. Mount ONCE at root (`useBootstrap`) — the return value is ignored;
 * the point is the side effect in `queryFn`, which mirrors the fetched profile
 * into the store so the whole app (parental gate, profile screen) sees changes
 * made on another device.
 *
 * Triggers (all declarative — no imperative AppState handling here):
 *   - **foreground** — via `refetchOnWindowFocus` + the `focusManager` bridge
 *     (`setupFocusManager`); the moment a second device re-engages.
 *   - **reconnect** — `refetchOnReconnect`.
 *   - **poll** — every 5 min, but only while the app is active
 *     (`refetchIntervalInBackground: false`), covering the both-open case
 *     (e.g. mobile + TV) without a background drain.
 *
 * Deliberately NOT tied to access-token refresh: the 401 interceptor refreshes
 * mid-session on a hot path, and a profile GET there would couple auth to a
 * needless round-trip. True real-time enforcement during playback belongs on
 * the server (playback decision / heartbeat), not this advisory client sync.
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
    staleTime: 60_000,
    refetchInterval: ME_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}