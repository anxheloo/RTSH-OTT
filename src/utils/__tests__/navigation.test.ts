/**
 * The status bar must follow the APP theme, not the system's. Since Expo SDK 58
 * (iOS 27 SDK) each iOS screen owns its status bar, and react-native-screens'
 * default follows the system appearance: dark icons on the dark theme whenever
 * the phone was in Light mode, on every pushed screen.
 */
import { Platform } from 'react-native';

import { getStatusBarScreenOptions, statusBarStyleFor } from '../navigation';

const setOS = (os: typeof Platform.OS) =>
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });

describe('statusBarStyleFor', () => {
  it('uses light icons on the dark theme and dark icons on the light theme', () => {
    expect(statusBarStyleFor('dark')).toBe('light');
    expect(statusBarStyleFor('light')).toBe('dark');
  });

  it('defers to the system when the theme follows the system', () => {
    expect(statusBarStyleFor('system')).toBe('auto');
  });
});

describe('getStatusBarScreenOptions', () => {
  const originalOS = Platform.OS;
  afterEach(() => setOS(originalOS));

  it('sets the stack status bar style from the app theme on iOS', () => {
    setOS('ios');
    expect(getStatusBarScreenOptions('dark')).toEqual({ statusBarStyle: 'light' });
  });

  it('leaves Android to the root StatusBar call', () => {
    setOS('android');
    expect(getStatusBarScreenOptions('dark')).toEqual({});
  });
});
