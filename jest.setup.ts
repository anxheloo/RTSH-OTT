/**
 * Jest environment setup (runs after the test framework loads).
 *
 * - Reanimated: official test setup — installs the JS-driven mock
 *   implementations + `toHaveAnimatedStyle` matchers, so components using
 *   entering/exiting animations and shared values render under jest.
 * - react-native-mmkv: pure-native module → in-memory stand-in mirroring the
 *   exact API surface `store/storage.ts` uses (`createMMKV` → set/getString/
 *   remove/getAllKeys), so the real Zustand store (persist included) runs in
 *   component tests without native bindings.
 * - @sentry/react-native: NOT just a native-module stand-in — an un-mocked SDK
 *   in the boot chain means the test suite SENDS EVENTS TO THE PRODUCTION
 *   PROJECT. That is CI noise indistinguishable from real user crashes, plus
 *   quota spent on it. `store/createUserSlice.ts` imports the monitoring seam,
 *   so this fires in plain store tests too, not only component tests.
 */
import { setUpTests } from 'react-native-reanimated';

setUpTests();

// Official jest mock shipped by the package — provides a SafeAreaProvider-less
// `useSafeAreaInsets` (zero insets) so screens render without the provider.
jest.mock(
  'react-native-safe-area-context',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: <T>(component: T) => component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({
    name: 'ReactNavigation',
    registerNavigationContainer: jest.fn(),
  })),
}));

jest.mock('react-native-mmkv', () => {
  const makeInstance = () => {
    const store = new Map<string, string | number | boolean>();
    return {
      set: (key: string, value: string | number | boolean) => void store.set(key, value),
      getString: (key: string) => {
        const v = store.get(key);
        return typeof v === 'string' ? v : undefined;
      },
      getNumber: (key: string) => {
        const v = store.get(key);
        return typeof v === 'number' ? v : undefined;
      },
      getBoolean: (key: string) => {
        const v = store.get(key);
        return typeof v === 'boolean' ? v : undefined;
      },
      contains: (key: string) => store.has(key),
      remove: (key: string) => void store.delete(key),
      delete: (key: string) => void store.delete(key),
      getAllKeys: () => [...store.keys()],
      clearAll: () => store.clear(),
    };
  };
  return { createMMKV: makeInstance, MMKV: jest.fn(makeInstance) };
});
