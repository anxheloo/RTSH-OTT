import type { HeroItem } from '@/types/domain';

import { apiClient } from '../client';
import { HOME_ROUTES } from '../endpoints';

export interface HomeFeed {
  heroes: HeroItem[];
}

export async function getHomeFeed(): Promise<HomeFeed> {
  const { data } = await apiClient.get<HomeFeed>(HOME_ROUTES.FEED);
  return data;
}
