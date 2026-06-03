import type { AppConfig } from '@/types/domain';

import { apiClient } from '../client';
import { CONFIG_ROUTES } from '../endpoints';

export async function getAppConfig(): Promise<AppConfig> {
  const { data } = await apiClient.get<AppConfig>(CONFIG_ROUTES.APP_CONFIG);
  return data;
}
