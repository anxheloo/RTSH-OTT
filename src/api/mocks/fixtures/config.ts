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
