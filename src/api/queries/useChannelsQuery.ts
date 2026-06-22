import { useQuery } from '@tanstack/react-query';

import type { ChannelType, PlaybackDecision } from '@/types/domain';

import { getChannelById, getChannels } from '../services/channels';
import { getCatchupPlayback } from '../services/epg';

type ChannelTypeInput = ChannelType | 'tv' | 'radio';

export const useChannelsQuery = (
  input: ChannelTypeInput,
  options?: { enabled?: boolean },
) => {
  const type = input.toUpperCase() as ChannelType;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channels', type],
    queryFn: () => getChannels(type),
    enabled: options?.enabled ?? true,
    // Override the global `staleTime: Infinity` so the foreground / reconnect /
    // mount refetch triggers fire (Home + Guide reuse `useRefreshOnFocus` for
    // tab focus, which forces a refetch regardless). 5min gates re-hits; 15min
    // keeps the cache after the screen unmounts.
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
  return { channels: data ?? [], isLoading, error, refetch };
};

/**
 * Unified playback decision query for live and catch-up.
 *
 * - `programId` omitted/null → `GET /channels/{id}` (live stream)
 * - `programId` set → `GET /channels/{id}/epg/{programId}` (recorded programme)
 *
 * Each (channelId, programId) pair is cached independently, so switching between
 * programmes and back to live never re-fetches a decision that's already cached.
 * The caller invalidates the live key (`[channelId, null]`) when returning to live
 * because stream URLs may be short-lived signed tokens.
 */
export const useChannelPlaybackQuery = (
  channelId: string | undefined,
  programId?: string | null,
) => {
  const pid = programId ?? null;
  const { data, isLoading, error } = useQuery<PlaybackDecision>({
    queryKey: ['channel-playback', channelId, pid],
    queryFn: () =>
      pid ? getCatchupPlayback(channelId!, pid) : getChannelById(channelId!),
    enabled: !!channelId,
    staleTime: Infinity,
  });
  return { playback: data ?? null, isLoading, error };
};