import type { RadioStation } from '@/types/domain';

import { apiClient } from '../client';
import { RADIO_ROUTES } from '../endpoints';

export async function getRadioStations(): Promise<RadioStation[]> {
  const { data } = await apiClient.get<{ stations: RadioStation[] }>(RADIO_ROUTES.LIST);
  return data.stations;
}

export async function getRadioById(id: string): Promise<RadioStation> {
  const { data } = await apiClient.get<{ station: RadioStation }>(RADIO_ROUTES.BY_ID(id));
  return data.station;
}
