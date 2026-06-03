import { useQuery } from '@tanstack/react-query';

import { getCatchupStream, getChannelStream, getRadioStream } from '../services/streams';

export const useChannelStreamQuery = (channelId: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stream', 'channel', channelId],
    queryFn: () => getChannelStream(channelId),
    enabled: !!channelId,
    staleTime: 30_000,
  });
  return { stream: data ?? null, isLoading, error };
};

export const useCatchupStreamQuery = (catchupId: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stream', 'catchup', catchupId],
    queryFn: () => getCatchupStream(catchupId),
    enabled: !!catchupId,
    staleTime: 30_000,
  });
  return { stream: data ?? null, isLoading, error };
};

export const useRadioStreamQuery = (radioId: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stream', 'radio', radioId],
    queryFn: () => getRadioStream(radioId),
    enabled: !!radioId,
    staleTime: 30_000,
  });
  return { stream: data ?? null, isLoading, error };
};