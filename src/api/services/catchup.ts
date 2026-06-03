import type { CatchupItem } from '@/types/domain';

import { apiClient } from '../client';
import { CATCHUP_ROUTES } from '../endpoints';

export async function getCatchupList(): Promise<CatchupItem[]> {
  const { data } = await apiClient.get<{ items: CatchupItem[] }>(CATCHUP_ROUTES.LIST);
  return data.items;
}

export async function getCatchupById(id: string): Promise<CatchupItem> {
  const { data } = await apiClient.get<{ item: CatchupItem }>(CATCHUP_ROUTES.BY_ID(id));
  return data.item;
}
