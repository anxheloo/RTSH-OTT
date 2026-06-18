import { useQuery } from '@tanstack/react-query';

import type { ChannelType, PlaybackDecision } from '@/types/domain';

import { getChannelById, getChannels } from '../services/channels';

export const useChannelsQuery = (type: ChannelType) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channels', type],
    queryFn: () => getChannels(type),
  });
  return { channels: data ?? [], isLoading, error, refetch };
};

/**
 * Fetches the playback decision for a channel via `GET /channels/{id}`.
 * Returns stream URLs + access decision — channel metadata (name, logo) comes
 * from the list cache (`useChannelsQuery`).
 */
export const useChannelPlaybackQuery = (id: string | undefined) => {
  const { data, isLoading, error } = useQuery<PlaybackDecision>({
    queryKey: ['channel-playback', id],
    queryFn: () => getChannelById(id!),
    enabled: !!id,
  });
  return { playback: data ?? null, isLoading, error };
};