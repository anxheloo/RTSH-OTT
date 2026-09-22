import { Linking, Platform } from 'react-native';

import { openStoreListing } from '../device';

jest.mock('expo-application', () => ({ applicationId: 'al.rtsh.tani' }));

const openURL = jest.spyOn(Linking, 'openURL');

describe('openStoreListing', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    openURL.mockReset();
  });

  it('opens the App Store app on iOS', async () => {
    Platform.OS = 'ios';
    openURL.mockResolvedValue(true);
    await openStoreListing();
    expect(openURL).toHaveBeenCalledWith('itms-apps://apps.apple.com/app/id6803853740');
    expect(openURL).toHaveBeenCalledTimes(1);
  });

  it('falls back to the web listing when there is no App Store app (simulator)', async () => {
    Platform.OS = 'ios';
    openURL.mockRejectedValueOnce(new Error('no handler')).mockResolvedValue(true);
    await openStoreListing();
    expect(openURL).toHaveBeenLastCalledWith('https://apps.apple.com/app/id6803853740');
  });

  it('falls back to the Play web listing when there is no Play Store (Android TV)', async () => {
    Platform.OS = 'android';
    openURL.mockRejectedValueOnce(new Error('no handler')).mockResolvedValue(true);
    await openStoreListing();
    expect(openURL).toHaveBeenNthCalledWith(1, 'market://details?id=al.rtsh.tani');
    expect(openURL).toHaveBeenLastCalledWith(
      'https://play.google.com/store/apps/details?id=al.rtsh.tani',
    );
  });
});
