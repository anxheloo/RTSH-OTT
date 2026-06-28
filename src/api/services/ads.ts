import type { Ad, AdPlacement } from '@/types/domain';

import { apiClient } from '../client';
import { ADS_ROUTES } from '../endpoints';

/**
 * Merged ads call per context (Ads = Option A — see docs/REALTIME_SOCKET.md §7).
 * With `channelId` → the channel's CHANNEL_CHANGE preroll + all MID_ROLLs (each
 * carrying an absolute `startTime`); without → the APP_OPEN ad. Always an array
 * (`[]` = none). Replaces the per-placement `getAd` calls.
 */
export const getAds = async (channelId?: number): Promise<Ad[]> => {
  const { data } = await apiClient.get<Ad[]>(ADS_ROUTES.AD, {
    params: channelId != null ? { channelId } : undefined,
  });
  return Array.isArray(data) ? data : [];
};

/**
 * Ad impression beacon (Ads = Option A — FE reports). Fire-and-forget: a raw
 * `apiClient.post` bypasses the TanStack QueryCache/MutationCache, so it never
 * triggers the global error modal — the `.catch` is the only silencing needed
 * (same pattern as the analytics `track` emitter). Returns void.
 */
export const reportAdImpression = (
  adId: number,
  body?: { channelId?: number; placement?: AdPlacement },
): void => {
  apiClient.post(ADS_ROUTES.IMPRESSION(adId), body ?? {}).catch(() => {});
};
