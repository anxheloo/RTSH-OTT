import type { Ad } from '@/types/domain';

/** APP_OPEN context (`GET /ads`) — single-element array. */
export const mockAdsAppOpen: Ad[] = [
  {
    id: 1,
    placement: 'APP_OPEN',
    type: 'IMAGE',
    mediaUrl: 'https://picsum.photos/seed/rtsh-ad-open/600/800',
    durationSeconds: 15,
    skippable: true,
    skipAfterSeconds: 5,
  },
];

/**
 * Channel context (`GET /ads?channelId=N`) — the CHANNEL_CHANGE preroll + a
 * sample MID_ROLL whose absolute `startTime` is stamped at request time by the
 * handler (so the mock midroll fires a fixed delay after channel open).
 */
export const mockAdsChannel = (startTime: string): Ad[] => [
  {
    id: 2,
    placement: 'CHANNEL_CHANGE',
    type: 'IMAGE',
    mediaUrl: 'https://picsum.photos/seed/rtsh-ad-channel/600/800',
    durationSeconds: 10,
    skippable: true,
    skipAfterSeconds: 3,
  },
  {
    id: 3,
    placement: 'MID_ROLL',
    type: 'IMAGE',
    mediaUrl: 'https://picsum.photos/seed/rtsh-ad-midroll/600/800',
    durationSeconds: 10,
    skippable: true,
    skipAfterSeconds: 3,
    startTime,
  },
];
