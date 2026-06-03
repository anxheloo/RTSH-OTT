import type { EpgItem } from '@/types/domain';

import { apiClient } from '../client';
import { EPG_ROUTES } from '../endpoints';

export async function getEpgByDate(date?: string): Promise<EpgItem[]> {
  const { data } = await apiClient.get<{ items: EpgItem[] }>(EPG_ROUTES.LIST, {
    params: date ? { date } : undefined,
  });
  return data.items;
}

export async function getProgramById(id: string): Promise<EpgItem> {
  const { data } = await apiClient.get<{ program: EpgItem }>(EPG_ROUTES.PROGRAM(id));
  return data.program;
}
