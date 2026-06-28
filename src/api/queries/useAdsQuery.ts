import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import type { Ad } from '@/types/domain';

import { getAds } from '../services/ads';

/**
 * Merged ads for a context (Ads = Option A). With `channelId` → the channel's
 * CHANNEL_CHANGE preroll + all MID_ROLLs; without → the APP_OPEN ad. Caller
 * splits by `placement`. `staleTime: 0` / `gcTime: 0` — ads are decided fresh per
 * open and dropped when the overlay unmounts (matches the prior `useAdQuery`).
 */
export const useAdsQuery = (
  channelId?: number,
  options?: Partial<UseQueryOptions<Ad[]>>,
): { ads: Ad[] } => {
  const { data } = useQuery<Ad[]>({
    queryKey: ['ads', channelId ?? 'app'],
    queryFn: () => getAds(channelId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    ...options,
  });
  return { ads: data ?? [] };
};
