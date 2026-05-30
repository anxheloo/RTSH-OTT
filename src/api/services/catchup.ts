import { apiClient } from '../client';
import { CATCHUP_ROUTES } from '../endpoints';

export async function getCatchupList(): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(CATCHUP_ROUTES.LIST);
  return data;
}

export async function getCatchupById(id: string): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(CATCHUP_ROUTES.BY_ID(id));
  return data;
}
