import type { AdCreative, AdPlacement } from '@/types/domain';

import { apiClient } from '../client';
import { ADS_ROUTES } from '../endpoints';

/**
 * Fetch the ad creative for a placement. Returns `null` when the server decides
 * no ad should run (frequency cap, slot disabled, etc.) — the client just
 * renders whatever it gets; slot policy is server-authoritative.
 *
 * APP_OPEN:      no channelId — called once on app entry.
 * CHANNEL_CHANGE: channelId required — called each time a channel is opened.
 */
export async function getAd(placement: 'APP_OPEN'): Promise<AdCreative | null>;
export async function getAd(
  placement: 'CHANNEL_CHANGE',
  channelId: number,
): Promise<AdCreative | null>;
export async function getAd(
  placement: AdPlacement,
  channelId?: number,
): Promise<AdCreative | null> {
  const params: Record<string, unknown> = { placement };
  if (channelId !== undefined) params.channelId = channelId;
  const { data } = await apiClient.get<AdCreative | null>(ADS_ROUTES.AD, { params });
  return data ?? null;
}
