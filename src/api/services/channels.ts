import { z } from 'zod';

import { getDeviceClass } from '@/utils/device';
import type { Channel, ChannelType, PlaybackDecision } from '@/types/domain';

import { apiClient } from '../client';
import { CHANNELS_ROUTES } from '../endpoints';

/**
 * Wire schema from `GET /api/v1/channels` (list). LOOSE (5.X.2): unknown keys
 * pass through; identity/URL fields fail loud, decorative ones tolerate junk.
 */
const channelDtoSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  type: z.enum(['TV', 'RADIO']),
  sortOrder: z.number().optional().catch(undefined),
  logoUrl: z.string().optional().catch(undefined),
  imageUrl: z.string().nullish().catch(undefined),
});

type ChannelDto = z.infer<typeof channelDtoSchema>;

/**
 * Wire schema from `GET /api/v1/channels/{id}` — playback decision only, no
 * metadata. `streams` tolerates absence for blocked decisions (a GEO_BLOCKED
 * response may carry no URLs). There is no media-plane session: the backend
 * confirmed (2026-07-03) the response is exactly `{ decision, channelId,
 * programId, noticeMessage, streams }` — no `sessionId`/`expiresAt`, no re-sign.
 */
export const playbackDecisionDtoSchema = z.looseObject({
  decision: z.string(),
  channelId: z.union([z.string(), z.number()]),
  programId: z.union([z.string(), z.number()]).nullish().catch(undefined),
  noticeMessage: z.string().optional().catch(undefined),
  streams: z.record(z.string(), z.string()).catch({}),
});

export type PlaybackDecisionDto = z.infer<typeof playbackDecisionDtoSchema>;

function toChannel(dto: ChannelDto): Channel {
  return {
    id: String(dto.id),
    name: dto.name,
    type: dto.type,
    sortOrder: dto.sortOrder ?? 0,
    logoUrl: dto.logoUrl ?? '',
    imageUrl: dto.imageUrl ?? undefined,
  };
}

export function toPlaybackDecision(dto: PlaybackDecisionDto): PlaybackDecision {
  return {
    decision: dto.decision,
    channelId: String(dto.channelId),
    programId: dto.programId == null ? '' : String(dto.programId),
    noticeMessage: dto.noticeMessage,
    streams: dto.streams,
  };
}

export async function getChannels(type: ChannelType): Promise<Channel[]> {
  const { data } = await apiClient.get(CHANNELS_ROUTES.LIST, {
    params: { type },
  });
  return z.array(channelDtoSchema).parse(data).map(toChannel);
}

/**
 * Returns the playback decision for a channel — stream URLs + access decision.
 * `deviceClass` lets the backend serve a platform-specific player URL.
 */
export async function getChannelById(id: string): Promise<PlaybackDecision> {
  const { data } = await apiClient.get(CHANNELS_ROUTES.BY_ID(id), {
    params: { deviceClass: getDeviceClass() },
  });
  return toPlaybackDecision(playbackDecisionDtoSchema.parse(data));
}
