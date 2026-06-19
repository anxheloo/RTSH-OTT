import type { AdCreative } from '@/types/domain';

export const mockAdAppOpen: AdCreative = {
  id: 1,
  type: 'IMAGE',
  mediaUrl: 'https://picsum.photos/seed/rtsh-ad-open/600/800',
  durationSeconds: 15,
  skippable: true,
  skipAfterSeconds: 5,
};

export const mockAdChannelChange: AdCreative = {
  id: 2,
  type: 'IMAGE',
  mediaUrl: 'https://picsum.photos/seed/rtsh-ad-channel/600/800',
  durationSeconds: 10,
  skippable: true,
  skipAfterSeconds: 3,
};
