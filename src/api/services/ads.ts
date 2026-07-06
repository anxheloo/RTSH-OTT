import type { Ad } from '@/types/domain';
import { adDtoSchema } from '@/types/domain';

import { apiClient } from '../client';
import { ADS_ROUTES } from '../endpoints';

/**
 * Merged ads call per context (Ads = Option A — see docs/REALTIME_SOCKET.md §7).
 * With `channelId` → the channel's CHANNEL_CHANGE preroll + all MID_ROLLs (each
 * carrying an absolute `startTime`); without → the APP_OPEN ad. Always an array
 * (`[]` = none). Replaces the per-placement `getAd` calls.
 *
 * Validation is PER ELEMENT (safeParse + drop): ads are optional content, so one
 * malformed creative must never sink the whole array — the valid ones still show.
 */
export const getAds = async (channelId?: number): Promise<Ad[]> => {
  const { data } = await apiClient.get(ADS_ROUTES.AD, {
    params: channelId != null ? { channelId } : undefined,
  });
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw): Ad[] => {
    const parsed = adDtoSchema.safeParse(raw);
    return parsed.success ? [parsed.data] : [];
  });
};

/**
 * Ad impression beacon (Ads = Option A — FE reports). Fire-and-forget: a raw
 * `apiClient.post` bypasses the TanStack QueryCache/MutationCache, so it never
 * triggers the global error modal — the `.catch` is the only silencing needed
 * (same pattern as the analytics `track` emitter). Returns void.
 *
 * Fired ONCE per ad shown, at completion (see `AdOverlay.onImpression`).
 * `watchedSeconds` (clamped to the ad's duration) is what powers the admin
 * avg-view-rate tile (Σwatched / Σduration) — see docs/REALTIME_SOCKET.md §6.1;
 * without it the impression still counts but avg-view-rate reads 0.
 *
 * `clientEventId` is the impression's IDENTITY (v4 UUID), minted by the CALLER at
 * the moment the impression completes and passed in — it is **per-impression, not
 * per-POST**: the backend de-dupes on it within a broadcast day (Europe/Tirane),
 * so a retry MUST replay the SAME id (a fresh id per attempt would defeat the
 * de-dupe and double-count — backend note 2026-07-06). This service is pure
 * transport: it does NOT mint the id, so a future store-and-forward retry that
 * replays the persisted body carries the original id unchanged. `placement` is
 * NOT sent — the endpoint silently drops it (it lives on the GET /ads response).
 */
export const reportAdImpression = (
  adId: number,
  body?: {
    watchedSeconds?: number;
    durationSeconds?: number;
    channelId?: number;
    clientEventId?: string;
  },
): void => {
  apiClient.post(ADS_ROUTES.IMPRESSION(adId), body ?? {}).catch(() => {});
};
