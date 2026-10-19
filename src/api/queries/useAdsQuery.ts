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
): { ads: Ad[]; isLoading: boolean } => {
  const { data, isLoading } = useQuery<Ad[]>({
    queryKey: ['ads', channelId ?? 'app'],
    queryFn: () => getAds(channelId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    ...options,
  });
  // `isLoading` lets the channel screen hold the stream until it knows whether a
  // preroll exists — otherwise a decision that resolves first starts the stream,
  // and the late preroll then cuts it.
  return { ads: data ?? [], isLoading };
};
