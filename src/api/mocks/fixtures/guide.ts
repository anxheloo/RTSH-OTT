/**
 * Guide fixture — `GET /api/v1/guide?type=TV|RADIO`. Derives each channel /
 * station's currently airing programme (`now`) from the same `getMockEpg`
 * generator the channel screen uses, so the Guide row's "now" matches what the
 * channel screen shows as the playing programme. Computed at call time (uses the
 * live clock).
 */
import type { ChannelType } from '@/types/domain';

import { mockChannels } from './channels';
import { getMockEpg } from './epg';

interface EpgFixtureItem {
  id: string;
  channelId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isAdult: boolean;
}

/** Wire `GuideChannelDto` shape (int64 ids, `now` as `GuideProgramDto | null`). */
export function getMockGuide(type: ChannelType = 'TV'): object[] {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  return mockChannels
    .filter((c) => c.type === type)
    .map((channel) => {
      const chId = String(channel.id);
      const items = getMockEpg(chId, today) as EpgFixtureItem[];
      const airing = items.find(
        (p) => now >= Date.parse(p.startTime) && now < Date.parse(p.endTime),
      );

      return {
        id: channel.id,
        name: channel.name,
        logoUrl: channel.logoUrl,
        imageUrl: channel.imageUrl,
        now: airing
          ? {
              id: Number(airing.id.replace(/\D/g, '')) || 0,
              name: airing.title,
              description: airing.description,
              start: airing.startTime,
              end: airing.endTime,
              ageRating: airing.isAdult ? '18' : '',
              isAdult: airing.isAdult,
            }
          : null,
      };
    });
}
