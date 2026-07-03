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
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['channels', type],
    queryFn: () => getChannels(type),
    enabled: options?.enabled ?? true,
  });
  // `dataUpdatedAt` advances on every (re)fetch — Home uses it to cache-bust the
  // live scene snapshots so a fresh frame loads on each refresh (see ChannelCard).
  return { channels: data ?? [], isLoading, error, refetch, dataUpdatedAt };
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
 * Freshness rides the **global config** (`staleTime: 5min` + refetch-on-focus/reconnect).
 * There is no media-plane session or re-sign (backend confirmed 2026-07-03): the
 * decision response is `{ decision, channelId, programId, noticeMessage, streams }`
 * and the client plays until it stops. A stale entry re-fetches the whole decision.
 */
export const useChannelPlaybackQuery = (
  channelId: string | undefined,
  programId?: string | null,
) => {
  const pid = programId ?? null;
  const queryKey = ['channel-playback', channelId, pid] as const;
  const { data, isLoading, error } = useQuery<PlaybackDecision>({
    queryKey,
    queryFn: () => (pid ? getCatchupPlayback(channelId!, pid) : getChannelById(channelId!)),
    enabled: !!channelId,
  });
  return { playback: data ?? null, isLoading, error };
};

// The pre-expiry re-sign implementation (disabled 2026-06-28) was moved out of
// this file — the reference snippet + re-enable instructions now live in
// docs/API.md → "POST /channels/playback/refresh" (and in git history).
