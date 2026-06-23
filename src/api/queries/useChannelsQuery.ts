import { useQuery } from '@tanstack/react-query';

import type { ChannelType, PlaybackDecision } from '@/types/domain';

import { getChannelById, getChannels } from '../services/channels';
import { getCatchupPlayback } from '../services/epg';

type ChannelTypeInput = ChannelType | 'tv' | 'radio';

/**
 * How far before a signed stream URL's `expiresAt` to re-fetch a fresh decision.
 * Refreshing ahead of expiry hides the source swap behind a still-valid token,
 * so playback never hits a 403 mid-segment. Floor keeps the timer sane if a
 * decision arrives already near (or past) expiry.
 */
const PLAYBACK_REFRESH_LEAD_MS = 30_000;
const PLAYBACK_REFRESH_FLOOR_MS = 5_000;

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
 *
 * The `streams` URLs are signed and expire at `expiresAt`; `refetchInterval`
 * re-fetches a fresh decision ~30s before that instant (self-correcting — each
 * refetch returns a new `expiresAt` the next interval recomputes from). `staleTime:
 * Infinity` is kept deliberately: the timed refetch is the *only* refresh path, so
 * incidental focus/reconnect refetches can't swap the source (and rebuffer) while a
 * token is still valid. `refetchIntervalInBackground: false` pauses the timer while
 * backgrounded (playback is suspended anyway); on foreground the interval resumes
 * and the floor re-fetches promptly if the token expired meanwhile.
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
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      const expiresAt = query.state.data?.expiresAt;
      if (!expiresAt) return false;
      const msUntilRefresh =
        new Date(expiresAt).getTime() - Date.now() - PLAYBACK_REFRESH_LEAD_MS;
      return Math.max(msUntilRefresh, PLAYBACK_REFRESH_FLOOR_MS);
    },
  });
  return { playback: data ?? null, isLoading, error };
};