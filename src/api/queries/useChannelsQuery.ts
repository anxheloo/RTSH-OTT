import { useQuery } from '@tanstack/react-query';

import { getChannelById, getChannels } from '../services/channels';

export const useChannelsQuery = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });
  return { channels: data ?? [], isLoading, error, refetch };
};

export const useChannelQuery = (id: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['channel', id],
    queryFn: () => getChannelById(id),
    enabled: !!id,
  });
  return { channel: data ?? null, isLoading, error };
};
