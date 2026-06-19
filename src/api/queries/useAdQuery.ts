import { useQuery } from '@tanstack/react-query';

import type { AdCreative } from '@/types/domain';

import { getAd } from '../services/ads';

type AppOpenParams = { placement: 'APP_OPEN'; channelId?: never };
type ChannelChangeParams = { placement: 'CHANNEL_CHANGE'; channelId: number };
type AdQueryParams = AppOpenParams | ChannelChangeParams;

/** Ad creative for a placement, or null when the server decides none applies. */
export const useAdQuery = (params: AdQueryParams, opts?: { enabled?: boolean }): { creative: AdCreative | null } => {
  const { placement, channelId } = params;

  const { data } = useQuery({
    queryKey: ['ad', placement, channelId],
    queryFn: () =>
      placement === 'CHANNEL_CHANGE'
        ? getAd('CHANNEL_CHANGE', channelId as number)
        : getAd('APP_OPEN'),
    enabled: opts?.enabled ?? true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  });

  return { creative: data ?? null };
};