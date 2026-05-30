import { apiClient } from '../client';
import { CONFIG_ROUTES } from '../endpoints';

export async function getAppConfig(): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(CONFIG_ROUTES.APP_CONFIG);
  return data;
}
