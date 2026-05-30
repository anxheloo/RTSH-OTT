import { apiClient } from '../client';
import { EPG_ROUTES } from '../endpoints';

export async function getEpgByDate(date: string): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(EPG_ROUTES.BY_DATE(date));
  return data;
}

export async function getProgramById(id: string): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(EPG_ROUTES.PROGRAM(id));
  return data;
}
