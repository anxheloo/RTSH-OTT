import { apiClient } from '../client';
import { STREAMS_ROUTES } from '../endpoints';

export interface StreamManifest {
  hlsUrl: string;
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
