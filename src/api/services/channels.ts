import { apiClient } from '../client';
import { CHANNELS_ROUTES } from '../endpoints';

export async function getChannels(): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(CHANNELS_ROUTES.LIST);
  return data;
}

export async function getChannelById(id: string): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(CHANNELS_ROUTES.BY_ID(id));
  return data;
}
