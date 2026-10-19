import { queryOptions, useQuery } from '@tanstack/react-query';

import { getChannelEpg } from '../services/epg';

/**
 * Shared key + fetcher for one channel's EPG day, so a prefetch (the channel
 * screen warms its neighbours for swipe / CH± switching) lands in exactly the
 * cache entry the hook below reads.
 */
export const channelEpgQueryOptions = (channelId: string, date?: string) =>
  queryOptions({
    queryKey: ['channel-epg', channelId, date ?? 'today'],
    queryFn: () => getChannelEpg(channelId, date),
  });

/**
 * Per-channel EPG — `GET /channels/{id}/epg?date=YYYY-MM-DD`.
 * Used by the channel screen and live parental guard. Changing `date` refetches
 * without invalidating other days (each date gets its own cache entry).
 */
export const useChannelEpgQuery = (channelId: string | undefined, date?: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    ...channelEpgQueryOptions(channelId ?? '', date),
    enabled: !!channelId,
  });
  return { items: data ?? [], isLoading, error, refetch };
};
