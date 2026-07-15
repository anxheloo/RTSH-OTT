import { z } from 'zod';

import type { EpgItem, GuideProgramDto, PlaybackDecision } from '@/types/domain';
import { guideProgramDtoSchema } from '@/types/domain';

import { apiClient } from '../client';
import { CHANNELS_ROUTES } from '../endpoints';
import { playbackDecisionDtoSchema, toPlaybackDecision } from './channels';

/** Maps the wire `GuideProgramDto` (plain array from real API) to the domain `EpgItem`. */
function mapGuideProgram(dto: GuideProgramDto, channelId: string): EpgItem {
  const now = Date.now();
  return {
    id: String(dto.id),
    channelId,
    channelName: '',
    title: dto.name,
    description: dto.description,
    startTime: dto.start,
    endTime: dto.end,
    isAdult: dto.isAdult,
    isLive: now >= new Date(dto.start).getTime() && now < new Date(dto.end).getTime(),
    hasCatchup: dto.hasCatchup,
    // Per-programme access look-ahead — without these two, a backend-flagged row
    // would be silently dropped here and `useLiveProgramBlock` could never block.
    decision: dto.decision,
    noticeMessage: dto.noticeMessage,
  };
}

/**
 * Per-channel EPG — `GET /channels/{id}/epg?date=YYYY-MM-DD`.
 * Real API returns a plain `GuideProgramDto[]`; mock returns `{ items: EpgItem[] }`.
 * Both are normalised here so callers always receive a domain `EpgItem[]`.
 */
export async function getChannelEpg(channelId: string, date?: string): Promise<EpgItem[]> {
  const { data } = await apiClient.get<GuideProgramDto[] | { items?: EpgItem[] }>(
    CHANNELS_ROUTES.EPG(channelId),
    { params: date ? { date } : undefined },
  );
  if (Array.isArray(data)) {
    // Real wire shape — validate at the boundary (loose; see guideProgramDtoSchema).
    return z
      .array(guideProgramDtoSchema)
      .parse(data)
      .map((item) => mapGuideProgram(item, channelId));
  }
  // Mock-only envelope: fixtures are already domain-shaped, no wire validation.
  return data.items ?? [];
}

/**
 * Fetch catch-up playback decision for a recorded programme —
 * `GET /channels/{channelId}/epg/{programId}`. Platform-specific player URL
 * selection now comes from the device baked into the access token at login
 * (no `?deviceClass=` param since 2026-07-14 — see ARCHITECTURE.md → Device
 * identity).
 */
export async function getCatchupPlayback(
  channelId: string,
  programId: string,
): Promise<PlaybackDecision> {
  const { data } = await apiClient.get(CHANNELS_ROUTES.CATCHUP_PLAYBACK(channelId, programId));
  return toPlaybackDecision(playbackDecisionDtoSchema.parse(data));
}
