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
 * The pre-expiry re-sign (interval re-fetch + `POST /channels/playback/refresh`) is
 * disabled for the moment — re-enable by reinstating a `refetchInterval` once the
 * signed-URL contract is finalized with the backend.
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

/* ───────────────────────────────────────────────────────────────────────────
 * PRESERVED — pre-expiry re-sign (disabled 2026-06-28; see ARCHITECTURE.md log).
 *
 * To restore the interval re-sign exactly as it was, replace `useChannelPlaybackQuery`
 * above with the body below AND re-add these imports at the top of the file:
 *
 *   import { queryClient } from '../client';
 *   import { getChannelById, getChannels, refreshPlayback } from '../services/channels';
 *
 * (The `refreshPlayback` service, `CHANNELS_ROUTES.PLAYBACK_REFRESH` endpoint, and the
 *  mock POST handler were all kept in place — nothing else to re-wire.)
 *
 * // How far before a signed stream URL's `expiresAt` to re-fetch a fresh decision.
 * // Refreshing ahead of expiry hides the source swap behind a still-valid token,
 * // so playback never hits a 403 mid-segment. Floor keeps the timer sane if a
 * // decision arrives already near (or past) expiry.
 * const PLAYBACK_REFRESH_LEAD_MS = 30_000;
 * const PLAYBACK_REFRESH_FLOOR_MS = 5_000;
 *
 * export const useChannelPlaybackQuery = (
 *   channelId: string | undefined,
 *   programId?: string | null,
 * ) => {
 *   const pid = programId ?? null;
 *   const queryKey = ['channel-playback', channelId, pid] as const;
 *   const { data, isLoading, error } = useQuery<PlaybackDecision>({
 *     queryKey,
 *     // Interval-driven re-fetches re-sign the existing session via the refresh
 *     // endpoint (cheap, no geo re-check); the first fetch (no cached `sessionId`)
 *     // establishes the session through the decision endpoint.
 *     queryFn: () => {
 *       const sessionId = queryClient.getQueryData<PlaybackDecision>(queryKey)?.sessionId;
 *       if (sessionId) return refreshPlayback(sessionId);
 *       return pid ? getCatchupPlayback(channelId!, pid) : getChannelById(channelId!);
 *     },
 *     enabled: !!channelId,
 *     refetchIntervalInBackground: false,
 *     refetchInterval: (query) => {
 *       const expiresAt = query.state.data?.expiresAt;
 *       if (!expiresAt) return false;
 *       const msUntilRefresh =
 *         new Date(expiresAt).getTime() - Date.now() - PLAYBACK_REFRESH_LEAD_MS;
 *       return Math.max(msUntilRefresh, PLAYBACK_REFRESH_FLOOR_MS);
 *     },
 *   });
 *   return { playback: data ?? null, isLoading, error };
 * };
 * ─────────────────────────────────────────────────────────────────────────── */