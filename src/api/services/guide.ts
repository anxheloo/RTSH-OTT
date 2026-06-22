/**
 * Guide service — `GET /api/v1/guide?type=TV|RADIO`. Returns one entry per
 * channel/station with its currently-airing programme (`now`); the endpoint
 * carries no `next`. `type` mirrors the channels endpoint (TV vs RADIO). Maps
 * the wire `GuideChannelDto` (int64 ids) to the domain `GuideChannel` (string
 * ids) so callers never touch wire shapes.
 */
import type { ChannelType, GuideChannel, GuideChannelDto } from '@/types/domain';

import { apiClient } from '../client';
import { GUIDE_ROUTES } from '../endpoints';

function toGuideChannel(dto: GuideChannelDto): GuideChannel {
  return {
    channelId: String(dto.id),
    channelName: dto.name,
    logoUrl: dto.logoUrl,
    imageUrl: dto.imageUrl,
    now: dto.now
      ? {
          id: String(dto.now.id),
          title: dto.now.name,
          description: dto.now.description,
          start: dto.now.start,
          end: dto.now.end,
          isAdult: dto.now.isAdult,
        }
      : null,
  };
}

export async function getGuide(type: ChannelType): Promise<GuideChannel[]> {
  const { data } = await apiClient.get<GuideChannelDto[]>(GUIDE_ROUTES.LIST, {
    params: { type },
  });
  return data.map(toGuideChannel);
}
