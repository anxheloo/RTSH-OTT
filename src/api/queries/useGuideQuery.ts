import { useQuery } from '@tanstack/react-query';

import type { ChannelType } from '@/types/domain';

import { getGuide } from '../services/guide';

/**
 * "Now" guide — `GET /api/v1/guide?type=TV|RADIO`. Server-driven: the backend
 * returns the airing programme per channel/station, so the client never times
 * programme boundaries here. `type` mirrors the channels endpoint (each value
 * is its own cache entry). Freshness comes from refetch triggers only:
 *
 *  - `staleTime: 5min` **overrides** the global `staleTime: Infinity` so the
 *    foreground/reconnect/mount triggers below actually fire (with Infinity
 *    nothing ever goes stale and they'd be no-ops); `gcTime: 15min` keeps the
 *    cache after the tab unmounts;
 *  - `refetchOnWindowFocus` (inherited true) → refetch on app foreground via the
 *    AppState↔focusManager bridge;
 *  - `refetchOnReconnect` (inherited true) → refetch when connectivity returns;
 *  - tab re-focus is covered by `useRefreshOnFocus(refetch)` at the call site
 *    (Expo Router keeps tabs mounted, so window-focus alone misses tab switches);
 *  - pull-to-refresh at the call site.
 *
 * Deliberately no `refetchInterval` — users pass through the Guide quickly, and
 * a poll would add needless server load (decision 2026-06-22).
 */
export const useGuideQuery = (type: ChannelType) => {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['guide', type],
    queryFn: () => getGuide(type),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
  // `dataUpdatedAt` advances on every (re)fetch — the Guide uses it to cache-bust
  // the live snapshot thumbnails so a fresh frame loads on each refresh (same
  // logic as Home's ChannelCard; see GuideRow / utils/image cacheBustUrl).
  return { guide: data ?? [], isLoading, error, refetch, dataUpdatedAt };
};
