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
 */
import { setUpTests } from 'react-native-reanimated';

setUpTests();

// Official jest mock shipped by the package — provides a SafeAreaProvider-less
// `useSafeAreaInsets` (zero insets) so screens render without the provider.
jest.mock('react-native-safe-area-context', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-safe-area-context/jest/mock').default,
);

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
