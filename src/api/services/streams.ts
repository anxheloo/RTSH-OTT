import type { Rendition } from '@/types/domain';

import { apiClient } from '../client';
import { STREAMS_ROUTES } from '../endpoints';

export interface StreamManifest {
  /**
   * Always present — the player's fallback source. A master (multivariant)
   * playlist when available, else a single rendition. A lone source plays through
   * this field alone, so the app works even with one test URL.
   */
  hlsUrl: string;
  /** Explicit master playlist. When present, `auto` uses it → native ABR. */
  masterUrl?: string;
  /** Per-rendition child URLs. When present, manual quality pinning is enabled. */
  renditions?: Rendition[];
  drmKeyUrl?: string;
  headers?: Record<string, string>;
}

export async function getChannelStream(id: string): Promise<StreamManifest> {
  const { data } = await apiClient.get<StreamManifest>(STREAMS_ROUTES.CHANNEL(id));
  return data;
}

export async function getCatchupStream(id: string): Promise<StreamManifest> {
  const { data } = await apiClient.get<StreamManifest>(STREAMS_ROUTES.CATCHUP(id));
  return data;
}

export async function getRadioStream(id: string): Promise<StreamManifest> {
  const { data } = await apiClient.get<StreamManifest>(STREAMS_ROUTES.RADIO(id));
  return data;
}
