import type { AppConfig, AppVersionInfo, DevicePlatform } from '@/types/domain';

import { apiClient } from '../client';
import { CONFIG_ROUTES } from '../endpoints';

export async function getAppConfig(): Promise<AppConfig> {
  const { data } = await apiClient.get<AppConfig>(CONFIG_ROUTES.APP_CONFIG);
  return data;
}

/**
 * Version gate. Store builds rely on the 426 interceptor instead; sideloaded
 * platforms (androidstb) poll this on boot to self-update via `downloadUrl`.
 */
export async function getAppVersion(platform: DevicePlatform): Promise<AppVersionInfo> {
  const { data } = await apiClient.get<AppVersionInfo>(CONFIG_ROUTES.APP_VERSION, {
    params: { platform },
  });
  return data;
}
