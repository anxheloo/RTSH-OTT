import type { AdCreative, AdSlot } from '@/types/domain';

import { apiClient } from '../client';
import { ADS_ROUTES } from '../endpoints';

/**
 * Ad manifest for a slot. The backend (mock today) decides whether an ad should
 * run for the slot — it returns a creative when one applies, or `null` when the
 * slot is disabled / frequency-capped. The client just renders whatever it gets
 * (slot orchestration + frequency cap policy stay server-authoritative). 16.1.
 */
export async function getAdManifest(slot: AdSlot): Promise<AdCreative | null> {
  const { data } = await apiClient.get<{ ad: AdCreative | null }>(ADS_ROUTES.MANIFEST(slot));
  return data.ad ?? null;
}
