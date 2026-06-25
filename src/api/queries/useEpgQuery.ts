import { useQuery } from '@tanstack/react-query';

import { getChannelEpg, getEpgByDate } from '../services/epg';

/** Global EPG — used by the Guide tab and Search for now/next across all channels. */
export const useEpgQuery = (date?: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['epg', date ?? 'today'],
    queryFn: () => getEpgByDate(date),
  });
  return { items: data ?? [], isLoading, error, refetch };
};

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
