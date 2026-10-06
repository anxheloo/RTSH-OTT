/**
 * Persistence is best-effort. zustand's persist middleware writes synchronously
 * inside every `set()`, AFTER the state is applied — so a throwing write (a box
 * with a full disk) aborted the CALLER instead: `setRememberMe` threw before the
 * login request was ever sent (REACT-NATIVE-RTSH-OTT-2M), and the NetInfo
 * listener threw on every connectivity change (-2J).
 */
import { storage } from '../storage';
import { useAppStore } from '../useAppStore';

let mockDiskFull = false;

jest.mock('react-native-mmkv', () => {
  const values = new Map<string, string>();
  return {
    createMMKV: () => ({
      set: (key: string, value: string) => {
        if (mockDiskFull) throw new Error(`MMKV.set(...): Failed to set value for key "${key}"!`);
        values.set(key, value);
      },
      getString: (key: string) => values.get(key),
      remove: (key: string) => values.delete(key),
      getAllKeys: () => [...values.keys()],
    }),
  };
});

afterEach(() => {
  mockDiskFull = false;
});

describe('storage on a full disk', () => {
  it('a store action still applies and does not throw', () => {
    mockDiskFull = true;
    expect(() => useAppStore.getState().setRememberMe(false)).not.toThrow();
    expect(useAppStore.getState().rememberMe).toBe(false);
  });

  it('storage.set does not throw', () => {
    mockDiskFull = true;
    expect(() => storage.set('k', 'v')).not.toThrow();
  });
});
