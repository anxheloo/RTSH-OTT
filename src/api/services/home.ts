import type { ContinueItem, HeroItem } from '@/types/domain';

import { apiClient } from '../client';
import { HOME_ROUTES } from '../endpoints';

export interface HomeFeed {
  heroes: HeroItem[];
  continueWatching: ContinueItem[];
}

export async function getHomeFeed(): Promise<HomeFeed> {
  const { data } = await apiClient.get<HomeFeed>(HOME_ROUTES.FEED);
  return data;
}
