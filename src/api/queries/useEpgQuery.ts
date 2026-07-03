import { useQuery } from '@tanstack/react-query';

import { getChannelEpg } from '../services/epg';

/**
 * Per-channel EPG — `GET /channels/{id}/epg?date=YYYY-MM-DD`.
 * Used by the channel screen and live parental guard. Changing `date` refetches
 * without invalidating other days (each date gets its own cache entry).
 */
export const useChannelEpgQuery = (channelId: string | undefined, date?: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channel-epg', channelId, date ?? 'today'],
    queryFn: () => getChannelEpg(channelId!, date),
    enabled: !!channelId,
  });
  return { items: data ?? [], isLoading, error, refetch };
};
