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
  geoRestricted: boolean;
}

/** Wire shape from `GET /api/v1/channels/{id}` — playback decision only, no metadata. */
interface PlaybackDecisionDto {
  decision: string;
  channelId: number | string;
  programId: number | string;
  noticeMessage?: string;
  streams: Record<string, string>;
}

function toChannel(dto: ChannelDto): Channel {
  return {
    id: String(dto.id),
    name: dto.name,
    type: dto.type,
    sortOrder: dto.sortOrder ?? 0,
    logoUrl: dto.logoUrl,
    imageUrl: dto.imageUrl ?? undefined,
    geoBlocked: dto.geoRestricted,
  };
}

function toPlaybackDecision(dto: PlaybackDecisionDto): PlaybackDecision {
  return {
    decision: dto.decision,
    channelId: String(dto.channelId),
    programId: String(dto.programId),
    noticeMessage: dto.noticeMessage,
    streams: dto.streams,
  };
}

export async function getChannels(type: ChannelType): Promise<Channel[]> {
  const { data } = await apiClient.get<ChannelDto[]>(CHANNELS_ROUTES.LIST, {
    params: { type },
  });
  return data.map(toChannel);
}

/** Returns the playback decision for a channel — stream URLs + access decision. */
export async function getChannelById(id: string): Promise<PlaybackDecision> {
  const { data } = await apiClient.get<PlaybackDecisionDto>(CHANNELS_ROUTES.BY_ID(id));
  return toPlaybackDecision(data);
}