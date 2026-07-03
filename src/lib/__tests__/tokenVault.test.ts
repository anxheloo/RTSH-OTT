/**
 * Unit tests for the refresh-token vault — the "remember me" matrix. The vault
 * owns WHERE the token lives (keychain vs memory) and these are the invariants
 * every auth path depends on:
 *   remember ON  → keychain write; survives "cold boot" (memory cleared)
 *   remember OFF → memory only + keychain CLEARED (no resurrected login)
 *   rotation     → re-persists to the SAME place as the session's choice
 */
import { REFRESH_TOKEN_KEY } from '@/constants/auth';

import { getFromKeychain, removeFromKeychain, storeOnKeychain } from '../keychain';
import {
  clearRefreshToken,
  getRefreshToken,
  rotateRefreshToken,
  setRefreshToken,
} from '../tokenVault';

jest.mock('../keychain', () => ({
  storeOnKeychain: jest.fn(async () => {}),
  getFromKeychain: jest.fn(async () => null),
  removeFromKeychain: jest.fn(async () => {}),
}));

const mockGet = getFromKeychain as jest.Mock;
const mockStore = storeOnKeychain as jest.Mock;
const mockRemove = removeFromKeychain as jest.Mock;

beforeEach(async () => {
  // The vault holds module-level session state — reset it through the public
  // API so each test starts signed-out (clearMocks wipes call history after).
  await clearRefreshToken();
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockStore.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

describe('setRefreshToken', () => {
  it('remember ON → persists to the keychain', async () => {
    await setRefreshToken('rt-1', { remember: true });
    expect(mockStore).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'rt-1');
    await expect(getRefreshToken()).resolves.toBe('rt-1');
  });

  it('remember OFF → memory only, and CLEARS any keychain leftover', async () => {
    await setRefreshToken('rt-2', { remember: false });
    expect(mockStore).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    // Still readable mid-session (memory hit, no keychain read).
    await expect(getRefreshToken()).resolves.toBe('rt-2');
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('getRefreshToken (cold boot)', () => {
  it('empty memory + keychain token → returns it and hydrates memory (one read)', async () => {
    mockGet.mockResolvedValue('persisted-rt');
    await expect(getRefreshToken()).resolves.toBe('persisted-rt');
    await expect(getRefreshToken()).resolves.toBe('persisted-rt');
    expect(mockGet).toHaveBeenCalledTimes(1); // second call is a memory hit
  });

  it('empty memory + empty keychain → null (signed out)', async () => {
    await expect(getRefreshToken()).resolves.toBeNull();
  });
});

describe('rotateRefreshToken', () => {
  it('re-persists to the keychain for a remembered session', async () => {
    await setRefreshToken('old', { remember: true });
    jest.clearAllMocks();
    await rotateRefreshToken('new');
    expect(mockStore).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'new');
  });

  it('stays memory-only for a non-remembered session', async () => {
    await setRefreshToken('old', { remember: false });
    jest.clearAllMocks();
    await rotateRefreshToken('new');
    expect(mockStore).not.toHaveBeenCalled();
    await expect(getRefreshToken()).resolves.toBe('new');
  });

  it('a keychain-hydrated (cold boot) session rotates back to the keychain', async () => {
    mockGet.mockResolvedValue('booted-rt');
    await getRefreshToken(); // hydrate → remembered
    jest.clearAllMocks();
    await rotateRefreshToken('rotated');
    expect(mockStore).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'rotated');
  });
});

describe('clearRefreshToken', () => {
  it('wipes memory AND the keychain', async () => {
    await setRefreshToken('rt', { remember: true });
    await clearRefreshToken();
    expect(mockRemove).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    await expect(getRefreshToken()).resolves.toBeNull();
  });
});
