import { getDeviceClass } from '@/utils/device';
import type { EpgItem, GuideProgramDto, PlaybackDecision } from '@/types/domain';

import { apiClient } from '../client';
import { CHANNELS_ROUTES, EPG_ROUTES } from '../endpoints';
import { type PlaybackDecisionDto, toPlaybackDecision } from './channels';

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
  };
}

export async function getEpgByDate(date?: string): Promise<EpgItem[]> {
  const { data } = await apiClient.get<{ items?: EpgItem[] } | EpgItem[]>(EPG_ROUTES.LIST, {
    params: date ? { date } : undefined,
  });
  return Array.isArray(data) ? data : (data.items ?? []);
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
    return data.map((item) => mapGuideProgram(item, channelId));
  }
  return data.items ?? [];
}

export async function getProgramById(id: string): Promise<EpgItem> {
  const { data } = await apiClient.get<{ program: EpgItem }>(EPG_ROUTES.PROGRAM(id));
  return data.program;
}

/**
 * Fetch catch-up playback decision for a recorded programme —
 * `GET /channels/{channelId}/epg/{programId}`. `deviceClass` lets the backend
 * serve a platform-specific player URL.
 */
export async function getCatchupPlayback(
  channelId: string,
  programId: string,
): Promise<PlaybackDecision> {
  const { data } = await apiClient.get<PlaybackDecisionDto>(
    CHANNELS_ROUTES.CATCHUP_PLAYBACK(channelId, programId),
    { params: { deviceClass: getDeviceClass() } },
  );
  return toPlaybackDecision(data);
}
