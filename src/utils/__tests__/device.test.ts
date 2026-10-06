/**
 * Device identity must survive a broken Android Keystore. Uncertified TV boxes
 * (H96 Max, X96, A95X, HK1…) reject every secure-store write with "Keystore
 * operation failed"; before this fallback the rejection escaped
 * `buildDeviceRegistration()` and the login button silently did nothing — 860
 * Sentry events from ~11 installs that could never sign in (REACT-NATIVE-RTSH-OTT-3).
 */
import { getFromKeychain, storeOnKeychain } from '@/lib/keychain';

jest.mock('@/lib/keychain', () => ({
  getFromKeychain: jest.fn(async () => null),
  storeOnKeychain: jest.fn(async () => {}),
}));

// Outlives `isolateModules`, like MMKV's file outlives an app restart.
const mockDisk = new Map<string, string>();
jest.mock('@/store/storage', () => ({
  storage: {
    set: (key: string, value: string) => void mockDisk.set(key, value),
    getString: (key: string) => mockDisk.get(key),
  },
}));

let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuid}` }));

const mockGet = getFromKeychain as jest.Mock;
const mockStore = storeOnKeychain as jest.Mock;

/** Fresh module = a fresh in-memory cache, i.e. a cold app launch. */
const coldLaunch = (): typeof import('../device') => {
  let mod!: typeof import('../device');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh registry needs a fresh require
    mod = require('../device');
  });
  return mod;
};

beforeEach(() => {
  mockDisk.clear();
  mockGet.mockResolvedValue(null);
  mockStore.mockResolvedValue(undefined);
});

describe('getOrCreateDeviceId', () => {
  it('persists a new id to the keychain on a healthy device', async () => {
    const id = await coldLaunch().getOrCreateDeviceId();
    expect(mockStore).toHaveBeenCalledWith('rtsh.device_id', id);
  });

  it('still resolves when the keychain write is rejected', async () => {
    mockStore.mockRejectedValue(new Error('Keystore operation failed'));
    await expect(coldLaunch().getOrCreateDeviceId()).resolves.toMatch(/^uuid-/);
  });

  it('keeps the same id across launches when the keychain is broken', async () => {
    mockStore.mockRejectedValue(new Error('Keystore operation failed'));
    const first = await coldLaunch().getOrCreateDeviceId();
    const second = await coldLaunch().getOrCreateDeviceId();
    expect(second).toBe(first);
  });

  it('prefers the keychain id when one exists', async () => {
    mockGet.mockResolvedValue('keychain-id');
    await expect(coldLaunch().getOrCreateDeviceId()).resolves.toBe('keychain-id');
  });
});
