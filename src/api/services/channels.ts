import type { Channel } from '@/types/domain';

import { apiClient } from '../client';
import { CHANNELS_ROUTES } from '../endpoints';

export async function getChannels(): Promise<Channel[]> {
  const { data } = await apiClient.get<{ channels: Channel[] }>(CHANNELS_ROUTES.LIST);
  return data.channels;
}

export async function getChannelById(id: string): Promise<Channel> {
  const { data } = await apiClient.get<{ channel: Channel }>(CHANNELS_ROUTES.BY_ID(id));
  return data.channel;
}
