import { apiClient } from '../client';
import { RADIO_ROUTES } from '../endpoints';

export async function getRadioStations(): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(RADIO_ROUTES.LIST);
  return data;
}

export async function getRadioById(id: string): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(RADIO_ROUTES.BY_ID(id));
  return data;
}
