import { getDeviceClass } from '@/utils/device';
import type { Channel, ChannelType, PlaybackDecision } from '@/types/domain';

import { apiClient } from '../client';
import { CHANNELS_ROUTES } from '../endpoints';

/** Wire shape from `GET /api/v1/channels` (list). */
interface ChannelDto {
  id: number | string;
  name: string;
  type: 'TV' | 'RADIO';
  sortOrder?: number;
  logoUrl: string;
  imageUrl?: string | null;
}

/** Wire shape from `GET /api/v1/channels/{id}` — playback decision only, no metadata. */
export interface PlaybackDecisionDto {
  decision: string;
  channelId: number | string;
  programId: number | string;
  noticeMessage?: string;
  streams: Record<string, string>;
  sessionId: string;
  expiresAt: string;
}

function toChannel(dto: ChannelDto): Channel {
  return {
    id: String(dto.id),
    name: dto.name,
    type: dto.type,
    sortOrder: dto.sortOrder ?? 0,
    logoUrl: dto.logoUrl,
    imageUrl: dto.imageUrl ?? undefined,
  };
}

export function toPlaybackDecision(dto: PlaybackDecisionDto): PlaybackDecision {
  return {
    decision: dto.decision,
    channelId: String(dto.channelId),
    programId: String(dto.programId),
    noticeMessage: dto.noticeMessage,
    streams: dto.streams,
    sessionId: dto.sessionId,
    expiresAt: dto.expiresAt,
  };
}

export async function getChannels(type: ChannelType): Promise<Channel[]> {
  const { data } = await apiClient.get<ChannelDto[]>(CHANNELS_ROUTES.LIST, {
    params: { type },
  });
  return data.map(toChannel);
}

/**
 * Returns the playback decision for a channel — stream URLs + access decision.
 * `deviceClass` lets the backend serve a platform-specific player URL.
 */
export async function getChannelById(id: string): Promise<PlaybackDecision> {
  const { data } = await apiClient.get<PlaybackDecisionDto>(CHANNELS_ROUTES.BY_ID(id), {
    params: { deviceClass: getDeviceClass() },
  });
  return toPlaybackDecision(data);
}