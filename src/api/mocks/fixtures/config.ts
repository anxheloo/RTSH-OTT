import type { AppVersionInfo, DevicePlatform } from '@/types/domain';

/** Mock app config returned by /config. */

export const mockAppConfig = {
  version: '1.0.0',
  forceUpdate: false,
  minVersion: '1.0.0',
  tcUrl: 'https://www.rtsh.al/termat',
  privacyUrl: 'https://www.rtsh.al/privatesia',
  ads: {
    launchEnabled: true,
    channelSwitchEnabled: false,
    channelSwitchFrequency: 3,
    scheduledEnabled: false,
  },
  geoRestricted: false,
  supportedLocales: ['sq', 'en'],
};

/** Mock version gate returned by /app/version?platform=… */
export const getMockAppVersion = (platform: DevicePlatform): AppVersionInfo => ({
  platform,
  latestVersion: '1.0.0',
  minSupportedVersion: '1.0.0',
  ...(platform === 'androidstb' && {
    downloadUrl: 'https://cdn.rtsh.al/apps/rtsh-tani-androidstb-1.0.0.apk',
  }),
});
